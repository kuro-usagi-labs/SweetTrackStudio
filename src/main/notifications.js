import { Notification } from 'electron'
import { join } from 'path'

export function sendNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({
      title,
      body,
      icon: join(__dirname, '../../build/icon.png'),
      silent: false
    }).show()
  }
}
