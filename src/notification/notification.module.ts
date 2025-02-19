import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationType } from './entities/notificationType.entity';
import { Notification } from './entities/notification.entity';
import { UsersModule } from 'src/user/user.module';
import { NotificationService } from './notification.service';
import { UserProvider } from 'src/user/services/user.provider';
import { NotificationController } from './notification.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([Notification, NotificationType]),
        forwardRef(() => UsersModule), // Use forwardRef for UsersModule
    ],
    providers: [UserProvider, NotificationService],
    controllers: [NotificationController],
    exports: [NotificationService],
})
export class NotificationModule { }
