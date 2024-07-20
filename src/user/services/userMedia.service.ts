import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { User } from '../user.entity';
import { Post } from 'src/post/post.entity';
import { UserProvider } from './user.provider';
import { SnapShareUtility } from 'src/common/utilities/snapShareUtility.utils';
const fs = require('fs');

@Injectable()
export class UserMediaService {

    public currUserID: number;
    public currUserName: string;

    constructor(private readonly entityManager: EntityManager, private readonly userProvider: UserProvider) {
        this.currUserID = this.userProvider.getCurrentUser()?.userId;
        this.currUserName = this.userProvider.getCurrentUser()?.username;
    }



    async postProfilePic(file: Express.Multer.File) {

        let resp: any;

        const userId: number = this.currUserID;

        if (!file)
            throw new BadRequestException('pleaseUploadImg');

        const filePath: string = file.path;

        let user = new User();

        await this.entityManager.transaction(async transactionalEntityManager => {

            user.userId = userId;
            user.profileImg = filePath;

            await transactionalEntityManager.save(User, user);
        });

        if (user && user?.profileImg) {
            user.profileImg = SnapShareUtility.urlConverter(user.profileImg);
        }

        resp = user;

        return resp;

    };

    async getArchivedPosts(postsByPage: number = 10, page: number = 1) {

        let resp: any;

        const userId = this.currUserID;

        let skip: number = (page - 1) * postsByPage

        // you need to join here te comments the like and the user to get the username 
        const posts = await this.entityManager
            .createQueryBuilder(Post, 'post')
            .where('post.userId = :userId', { userId })
            .andWhere('post.archived = :archived', { archived: true })
            .andWhere('post.deleted = :deleted', { deleted: false })
            .take(postsByPage)
            .skip(skip)
            .getMany();


        for (const post of posts) {
            if (post?.media)
                post.media = SnapShareUtility.urlConverter(post.media);
        }

        resp = posts;

        return resp;
    };



    // edhe ketu beje me if(currUserId === userId) nqs eshte useri i loguar ti i ben skip dhe i jep direkt postet
    // nqs jo ti shikon nqs eshte te connectionat e tua dhe ta ka pranuar, nese jo athere return message qe duhet ti besh follow / ose duhet te ta pronoj follow request-in;
    // nqs po i dergon  te gjitah postet me pagination
    //shto si req param dhe user
    async getUserPosts(postsByPage: number = 10, page: number = 1) {


        let currUserID = this.currUserID;
        // what are you going to do first is get all the posts which have archieved true












    }




}