import {Request} from "firebase-functions";
import functions = require("firebase-functions");
import admin = require("firebase-admin");
import * as express from "express";

// import answers4 from "./answers/4.json";
// import answers5 from "./answers/5.json";
// import answers6 from "./answers/6.json";

const gameIdEpoch: number = Date.UTC(2022, 2, 3); // March 3, 2022 UTC 00:00

function getIntervalForWordLengthMs(wordLength: number): number {
  switch (wordLength) {
    case 4:
    case 5:
    case 6:
      return 21600000; // 6h

    default:
      return 86400000; // 24h
  }
}

function getCurrentGameIdForWordLength(wordLength: number) : number {
  return Math.floor((Date.now() - gameIdEpoch) / getIntervalForWordLengthMs(wordLength));
}

function getTimeUntilNextGameSeconds(wordLength: number) {
  return Math.ceil(((gameIdEpoch + getIntervalForWordLengthMs(wordLength) * (1+getCurrentGameIdForWordLength(wordLength))) - Date.now()) / 1000);
}

admin.initializeApp();

export const getWord = functions.https.onRequest(
    async (req: Request, resp: express.Response) => {
      const wordParam = req.query.wordLength as string;
      if (wordParam === undefined || wordParam == "") {
        resp.sendStatus(400);
        return;
      }

      const wordLength: number = parseInt(wordParam);
      const firestoreDb = admin.firestore();
      const answersDoc = firestoreDb
          .doc("answers/english/list/" + (wordLength));
      const answersSnapshot = await answersDoc.get();
      if (!answersSnapshot.exists) {
        resp.status(400).send("WordLength has no answers");
        return;
      }


      const answers = answersSnapshot.get("answers");
      const gameId = getCurrentGameIdForWordLength(wordLength);

      const answer = answers[gameId % answers.length];
      resp.status(200).json({
        answer: answer,
        gameId: gameId,
        nextGameInSeconds: getTimeUntilNextGameSeconds(wordLength),
      });
    });

// export const deployWordLists = functions.https.onRequest(
//     async (req: Request, resp: express.Response) => {
//       const firestoreDb = admin.firestore();
//       const answers = [answers4, answers5, answers6];
//       for (let i = 0; i < answers.length; ++i) {
//         const doc = firestoreDb.doc("answers/english/list/" + (i+4));
//         await doc.set({
//           "answers": answers[i],
//         });
//       }
//       resp.sendStatus(200);
//     });
