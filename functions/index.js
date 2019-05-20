/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * Triggers when a user gets a new follower and sends a notification.
 *
 * Followers add a flag to `/followers/{followedUid}/{followerUid}`.
 * Users save their device notification tokens to `/users/{followedUid}/notificationTokens/{notificationToken}`.
 */
exports.sendFollowerNotification = functions.database.ref('/pets/{ownerUid}/{petUid}/interestedUid/{interestedUid}')
    .onWrite(async (change, context) => {
      const ownerUid = context.params.ownerUid;
      const petUid = context.params.petUid;
      const interestedUid = context.params.interestedUid;
      // If un-follow we exit the function.
      if (!change.after.val()) {
        return console.log('User ', ownerUid, 'No have an interested in', petUid, 'is:', interestedUid);
      }
      console.log('We have a new interested UID:', interestedUid, 'for pet:', petUid);

      var userRef = admin.database().ref(`/usuarios/${interestedUid}`).once('value');

      const promiseRes = await Promise.all([userRef]);
      const userSnapshot = promiseRes[0];

      console.log(userSnapshot.child("nome").val());
      var userName = userSnapshot.child("nome").val();

      // Get the list of device notification tokens.
      const getDeviceTokenPromise = admin.database()
          .ref(`/usuarios/${ownerUid}/notificationToken`).once('value');

      // const getDeviceTokenPromise = "cF1LYCLGj78:APA91bEywsiPZSE7JZnqOCUrSSeqAojwRaiTaepy8XGpjchiOHoKbRZfGEZxp0_AEnudSosZwQh-WlZVPm59-NjlcrhjdoqHR4vXSvqm9d23gy3_35Jas5oIY3sekgi_DEH71mVmSvm-";

      // Get the follower profile.
      const getInterestedProfilePromise = admin.auth().getUser(interestedUid);

      // The snapshot to the user's tokens.
      let tokensSnapshot;

      // The array containing all the user's tokens.
      let tokens;

      const results = await Promise.all([getDeviceTokenPromise, getInterestedProfilePromise]);
      tokensSnapshot = results[0];
      const interested = results[1];

      // Check if there are any device tokens.
      if (!tokensSnapshot.hasChildren()) {
        return console.log('There are no notification tokens to send to.');
      }
      console.log('There are', tokensSnapshot.numChildren(), 'tokens to send notifications to.');
      console.log('Fetched interested profile', interested);

      // Notification details.
      const payload = {
        notification: {
          title: 'Você tem um novo interessado!',
          body: `${userName} está interessado em adotar o seu pet.`
        }
      };

      // Listing all tokens as an array.
      tokens = Object.keys(tokensSnapshot.val());
      // Send notifications to all tokens.
      const response = await admin.messaging().sendToDevice(tokens, payload);
      // For each message check if there was an error.
      // const tokensToRemove = [];
      // response.results.forEach((result, index) => {
      //   const error = result.error;
      //   if (error) {
      //     console.error('Failure sending notification to', tokens[index], error);
      //     // Cleanup the tokens who are not registered anymore.
      //     if (error.code === 'messaging/invalid-registration-token' ||
      //         error.code === 'messaging/registration-token-not-registered') {
      //       tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
      //     }
      //   }
      // });
      // return Promise.all(tokensToRemove);
    });
