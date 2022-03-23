import {Request} from "firebase-functions";
import functions = require("firebase-functions");
import admin = require("firebase-admin");
import * as express from "express";

// import answers4 from "./answers/4.json";
// import answers5 from "./answers/5.json";
// import answers6 from "./answers/6.json";

interface GameInfo
{
  gameId: number;
  answer: string;
  startedAt: string;
  endsAt: string;
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
      if (isNaN(wordLength)) {
        resp.status(400).send("Invalid wordLength");
        return;
      }

      const firestoreDb = admin.firestore();
      const currentDoc = firestoreDb
          .doc("games/english");
      const docSnapshot = await currentDoc.get();
      if (!docSnapshot.exists) {
        resp.status(400).send("No ongoing game for this wordLength");
        return;
      }

      const data = docSnapshot.get(wordLength.toString());
      if (data === undefined) {
        resp.status(400).send("No ongoing game for this wordLength");
        return;
      }
      resp.status(200).json(data);
    });

interface UpdateWordResponse
{
  success: boolean;
  data: any;
}

async function updateCurrentWordFunc(wordLength: number, endsInSeconds: number): Promise<UpdateWordResponse> {
  const firestoreDb = admin.firestore();
  const answersDoc = firestoreDb
      .doc("answers/english");
  const answersSnapshot = await answersDoc.get();
  if (!answersSnapshot.exists) {
    return {
      success: false,
      data: "WordLength has no answers",
    };
  }
  const answers = answersSnapshot.get(wordLength.toString());

  const currentDoc = firestoreDb
      .doc("games/english");

  const docSnapshot = await currentDoc.get();

  let currentGame = docSnapshot.exists ?
    docSnapshot.get(wordLength.toString()) as GameInfo :
    undefined;

  if (currentGame === undefined) {
    currentGame = {
      gameId: 0,
      answer: answers[0],
      startedAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + endsInSeconds * 1000).toISOString(),
    };
  } else {
    // Log
    const archivesDoc = firestoreDb.doc("games/english/archive/" + wordLength);
    const archive = await archivesDoc.get();
    let finalData: any = {};
    if (archive.exists) {
      const archiveData = archive.get(currentGame.answer);
      if (archiveData !== undefined) {
        finalData = archiveData;
      }
    }
    finalData.lastUsed = currentGame.startedAt;
    if (finalData.games === undefined) {
      finalData.games = {};
    }
    finalData.games[currentGame.startedAt] = currentGame;
    if (!archive.exists) {
      await archivesDoc.create({
        [currentGame.answer]: finalData,
      });
    } else {
      await archivesDoc.update(currentGame.answer, finalData);
    }

    const newGameId = currentGame.gameId + 1;
    currentGame = {
      gameId: newGameId,
      answer: answers[newGameId % answers.length],
      startedAt: new Date().toISOString(),
      endsAt: new Date(Date.now() + endsInSeconds * 1000).toISOString(),
    };
  }

  await currentDoc.update(wordLength.toString(), currentGame);

  return {
    success: true,
    data: currentGame,
  };
}

export const scheduledFourLetterWordUpdate = functions.pubsub.schedule("0 0-23/4 * * *")
    .timeZone("UTC")
    .onRun(async (context) => {
      const resp = await updateCurrentWordFunc(4, 14400);
      if (!resp.success) {
        console.log(resp.data);
      }
      return null;
    });

export const scheduledFiveLetterWordUpdate = functions.pubsub.schedule("0 1-23/4 * * *")
    .timeZone("UTC")
    .onRun(async (context) => {
      const resp = await updateCurrentWordFunc(5, 14400);
      if (!resp.success) {
        console.log(resp.data);
      }
      return null;
    });

export const scheduledSixLetterWordUpdate = functions.pubsub.schedule("0 2-23/4 * * *")
    .timeZone("UTC")
    .onRun(async (context) => {
      const resp = await updateCurrentWordFunc(6, 14400);
      if (!resp.success) {
        console.log(resp.data);
      }
      return null;
    });

// export const updateCurrentWord = functions.https.onRequest(
//     async (req: Request, resp: express.Response) => {
//       const wordParam = req.query.wordLength as string;
//       const endsInSecondsParam = req.query.endsInSeconds as string;
//       if (wordParam === undefined || wordParam == "") {
//         resp.status(400).send("Missing wordLength");
//         return;
//       }
//       const wordLength: number = parseInt(wordParam);
//       if (isNaN(wordLength)) {
//         resp.status(400).send("Invalid wordLength");
//         return;
//       }
//       if (endsInSecondsParam === undefined || endsInSecondsParam == "") {
//         resp.status(400).send("Missing endsInSeconds");
//         return;
//       }
//       const endsInSeconds: number = parseInt(endsInSecondsParam);
//       if (isNaN(endsInSeconds)) {
//         resp.status(400).send("Invalid endsInSeconds");
//         return;
//       }
//
//       const response = await updateCurrentWordFunc(wordLength, endsInSeconds);
//       resp.status(response.success ? 200 : 400).json(response.data);
//     });

// export const deployWordLists = functions.https.onRequest(
//     async (req: Request, resp: express.Response) => {
//       const firestoreDb = admin.firestore();
//       const doc = firestoreDb.doc("answers/english");
//       await doc.set({
//         4: answers4,
//         5: answers5,
//         6: answers6,
//       });
//       resp.sendStatus(200);
//     });
