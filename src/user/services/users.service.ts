import { Injectable, NotFoundException, UnauthorizedException, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { User } from '../user.entity';
import { Post } from 'src/post/post.entity';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import { UpdateUserDto } from '../dtos/UpdateUserDto';
import { UserProvider } from './user.provider';
import { CreateUserReq, UserInfoDto } from '../dtos/CreateUser.dto';
const fs = require('fs');

@Injectable()
export class UsersService {

    public currUserID: number;
    public currUserName: string;

    constructor(private readonly entityManager: EntityManager, private readonly userProvider: UserProvider) {
        this.currUserID = this.userProvider.getCurrentUser()?.userId;
        this.currUserName = this.userProvider.getCurrentUser()?.username;
    }


    async createUser(createUserDto: CreateUserReq) {

        let { email, username, password } = createUserDto;
        // Check if the user with the given email already exists
        const existingUser = await this.entityManager.findOne(User, {
            where: [{ email }, { username }],
        });

        if (existingUser) {
            // Determine which field(s) caused the conflict
            if (existingUser.email === email) {
                throw new ConflictException('emailTaken');
            } else if (existingUser.username === username) {
                throw new ConflictException('usernameTaken');
            }
        }

        // Create a new user
        const saltOrRounds = 10;
        password = await bcrypt.hash(password, saltOrRounds);
        const newUser = this.entityManager.create(User, {
            email,
            username,
            password,
        });

        let createdUser = await this.entityManager.save(newUser);

        const { password: excludedPassword, ...userInfo } = createdUser;

        return { message: "userCreatedSuccessfully", userInfo };
    }


    async getUserById(userId: number): Promise<User | undefined> {

        const user = this.entityManager.findOneBy(User, { userId });

        if (!user)
            throw new NotFoundException("userNotFound");

        return user;
    }

    async getUserByUsername(username: string): Promise<User | undefined> {
        const user = this.entityManager.findOneBy(User, { username });

        if (!user)
            throw new NotFoundException("userNotFound");

        return user;
    }

    // edhe kete beje me if(currUserId === userId) nqs eshte useri i loguar jepi me shum te dhena nese eshte other user jepi aq data sa duhet

    async getCurrUserData(): Promise<{ user: UserInfoDto, message: string }> {

        const userId: number = this.currUserID;

        let user = await this.getUserById(userId);

        const { password: excludedPassword, ...userInfo } = user;

        return { message: 'UserArchivedSuccessfully', user: userInfo };
    }


    async updateUser(updateUserDto: UpdateUserDto): Promise<{ user: UserInfoDto, message: string }> {

        const userId: number = this.currUserID;

        const user = await this.getUserById(userId);

        const { ...updateFields } = updateUserDto;

        for (const key of Object.keys(updateFields)) {

            if (updateUserDto[key] !== undefined && key === "email") {

                const usedEmail = await this.entityManager
                    .createQueryBuilder()
                    .select('COUNT(*)', 'count')
                    .from(User, 'user')
                    .where('user.email = :email', { email: updateUserDto[key] })
                    .andWhere('user.userId != :userId', { userId: user.userId })
                    .getRawOne();

                let { count } = usedEmail;

                if (count > 0)
                    throw new ConflictException("emailIsTaken");
            }

            if (updateUserDto[key] !== undefined && key === "username") {

                const usedUsername = await this.entityManager
                    .createQueryBuilder()
                    .select('COUNT(*)', 'count')
                    .from(User, 'user')
                    .where('user.username = :username', { username: updateUserDto[key] })
                    .andWhere('user.userId != :userId', { userId: user.userId })
                    .getRawOne();


                let { count } = usedUsername;

                if (count > 1)
                    throw new ConflictException("usernameIsTaken");
            }
            if (updateUserDto[key] !== undefined && key === "password") {

                const saltOrRounds = 10;
                const hashedPassword = await bcrypt.hash(updateUserDto[key], saltOrRounds);
                user[key] = hashedPassword;
            }

            if (updateUserDto[key] !== undefined) {
                user[key] = updateUserDto[key];
            }
        }

        const updatedUser = await this.entityManager.save(User, user);

        const { password: __, ...userInfo } = updatedUser;

        return { message: 'userModifiedSucesfully', user: userInfo };
    }

    async archiveUser(): Promise<{ user: UserInfoDto, message: string }> {

        const userId: number = this.currUserID;

        const user = await this.getUserById(userId);

        await this.entityManager.update(User, userId, { archive: true });

        const { password: excludedPassword, ...userInfo } = user;

        return { message: 'UserArchivedSuccessfully', user: userInfo };
    }

    async hardDeleteUser(): Promise<{ user: UserInfoDto, message: string }> {

        const userId: number = this.currUserID;

        const user = await this.getUserById(userId);

        await this.entityManager.transaction(async (transactionalEntityManager: EntityManager) => {
            const posts: Post[] = await transactionalEntityManager
                .createQueryBuilder(Post, 'post')
                .where('post.userId = :userId', { userId: user.userId })
                .getMany();

            await transactionalEntityManager.remove(User, user);

            for (const post of posts) {
                if (post?.media) {
                    const filePath = path.resolve(post.media);
                    try {
                        await fs.promises.unlink(filePath);
                    } catch (err) {
                        throw new InternalServerErrorException('errorDeletingPost');
                    }
                }
            }
        });

        const { password: excludedPassword, ...userInfo } = user;

        return { message: 'userDeletedSuccessfully', user: userInfo };
    }


}