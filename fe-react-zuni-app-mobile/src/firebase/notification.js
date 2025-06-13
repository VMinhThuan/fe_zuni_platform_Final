import messaging from '@react-native-firebase/messaging';
import { Platform, Alert } from 'react-native';

// Gọi ở App khởi động
export async function setupFCM(onNotification) {
    // Yêu cầu quyền nhận thông báo
    await messaging().requestPermission();

    // Lấy token FCM (gửi lên server để backend gửi push)
    const fcmToken = await messaging().getToken();
    // TODO: Gửi fcmToken này lên backend gắn với userId

    // Lắng nghe khi app foreground
    messaging().onMessage(async remoteMessage => {
        onNotification && onNotification(remoteMessage);
    });

    // Lắng nghe khi app background hoặc quit (user bấm vào notification)
    messaging().setBackgroundMessageHandler(async remoteMessage => {
        // Xử lý logic nếu cần
    });

    // Khi user bấm vào notification (app foreground/background/quit)
    messaging().onNotificationOpenedApp(remoteMessage => {
        // Điều hướng tới màn chat, call, v.v. nếu cần
    });

    // Khi app bị kill, mở từ notification
    messaging()
        .getInitialNotification()
        .then(remoteMessage => {
            if (remoteMessage) {
                // Điều hướng tới màn chat, call, v.v. nếu cần
            }
        });
}