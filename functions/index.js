/* eslint-disable */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Timestamp } = require("firebase-admin/firestore");
const fetch = require("node-fetch");
var cron = require("node-cron");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { default: OpenAI } = require("openai");
require("dotenv").config();

admin.initializeApp();
const db = admin.firestore();

let leftSources = [];
let middleSources = [];
let rightSources = [];
let sources = [];

let baseURL = "https://url-content-extractor.p.rapidapi.com/";
const options = {
  method: "GET",
  headers: {
    "X-RapidAPI-Key": "3b3d59a4b1msh9fe345204a200d6p1bf9cdjsnbc7461a03162",
    "X-RapidAPI-Host": "url-content-extractor.p.rapidapi.com",
  },
};
const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
});


const bucket = admin.storage().bucket(); // For Firebase cloud storage

/* This function does not check for premium users, the caller should do that */
async function summarizeArticle(collection, articleId) {
  if (!articleId || !collection) return null;
  const snapshot = await db
    .collection(collection)
    .where("id", "==", articleId)
    .get();

  if (snapshot.empty) {
    return null;
  }
  const article = snapshot.docs[0];

  /* Check if article is already summarized, if so, return it */
  const cachedSummary = await db
    .collection(collection)
    .doc(article.id)
    .collection("gpt-summaries")
    .doc("only")
    .get();
  if (cachedSummary.exists) {
    const summary = cachedSummary.data().summary;
    if (summary)
      return {
        summary: summary,
        fromCache: true,
      };
  }

  const data = article.data();
  if (data.source === "The Washington Post") return null; // Putting this here just to be safe

  // Shorten textBody if it exceeds token limit
  let text = data.textBody;
  if (text.length > 14000) {
    // Limit it to the first 12000 characters
    text = text.substring(0, 14000);
  }

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: generatePrompt(text) }],
    });

    const response = chatCompletion.choices[0].message.content;

    return {
      summary: response,
      fromCache: false,
      docId: article.id,
    };
  } catch (err) {
    console.log("Error in summarizing article");
    console.log(err);
    return null;
  }
}

function generatePrompt(textBody) {
  return `Create a two sentence summary for this news article: ${textBody}`;
}

exports.summarizeArticle = functions.https.onCall(async (req) => {
  console.log(req);
  if (!req.collection || !req.article)
    throw new HttpsError("invalid-argument", "Missing arguments");

  /* Check if user has access to this feature.
   * Right now, only premium users have access to this feature
   * and admins
   */

  const userId = req.user;
  try {
    let user = await db.collection("users").doc(userId).get();
    user = user.data();
  } catch (error) {
    /* Ok I know this looks silly, but it just ensures that the client gets a proper error
     * and not something about uid not being found
     */
    throw new HttpsError(
      "unauthenticated",
      error.message || "User is not a Premium User"
    );
  }

  const response = await summarizeArticle(req.collection, req.article);
  if (!response) throw new HttpsError("internal", "Something went wrong");
  const { summary, fromCache } = response;

  if (!summary) throw new HttpsError("internal", "Something went wrong");
  if (!fromCache) {
    const docId = response.docId;
    await db
      .collection(req.collection)
      .doc(docId)
      .collection("gpt-summaries")
      .doc("only")
      .set({
        summary,
        timestamp: Timestamp.now(),
      });
  }
  return {
    summary,
  };
});

function getProperCollection(a) {
  let rightContains = rightSources.some((e) => {
    if (a.link.includes(e)) return true;
    return false;
  });

  let middleContains = middleSources.some((e) => {
    if (a.link.includes(e)) return true;
    return false;
  });

  let leftContains = leftSources.some((e) => {
    if (a.link.includes(e)) return true;
    return false;
  });

  if (rightContains) return "right-articles";
  else if (middleContains) return "middle-articles";
  else if (leftContains) return "left-articles";
  else return "No Source Found";
}

async function getContent(json) {
  try {
    baseURL = "https://url-content-extractor.herokuapp.com/";

    let response = await fetch(baseURL + "content?url=" + json.link, options);
    let respJson = await response.json();

    return respJson;
  } catch (error) {
    return { status: 500 };
  }
}

async function doSearch(query) {
  try {
    let response = await fetch(
      baseURL + "search?query=" + query.topic,
      options
    );
    let json = await response.json();
    return json;
  } catch (error) {
    return { status: 400 };
  }
}

async function deleteOldArticles() {
  return new Promise(async (resolve) => {
    let docs = await db.collection("trending-articles").get();
    let promises = [];
    docs.forEach((d) => {
      let data = d.data();
      let newDate = new Date(data.date.toDate());
      let today = new Date().toISOString().slice(0, 10);

      const startDate = newDate;
      const endDate = today;

      const diffInMs = new Date(endDate) - new Date(startDate);
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
      if (diffInDays >= 2) {
        promises.push(
          db.collection("trending-articles").doc(d.id).update({
            deleted: true,
          })
        );
      }
    });

    Promise.all(promises).then(() => resolve());
  });
}

async function deleteMyFeedArticles() {
  return new Promise(async (resolve) => {
    let docs = await db.collection("left-articles").get();
    let promises = [];
    docs.forEach((d) => {
      let data = d.data();
      let newDate = new Date(data.date.toDate());
      let today = new Date().toISOString().slice(0, 10);

      const startDate = newDate;
      const endDate = today;

      const diffInMs = new Date(endDate) - new Date(startDate);
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

      if (diffInDays >= 7) {
        promises.push(
          db.collection("left-articles").doc(d.id).update({
            deleted: true,
          })
        );
      }
    });
    docs = await db.collection("middle-articles").get();
    docs.forEach((d) => {
      let data = d.data();
      let newDate = new Date(data.date.toDate());
      let today = new Date().toISOString().slice(0, 10);

      const startDate = newDate;
      const endDate = today;

      const diffInMs = new Date(endDate) - new Date(startDate);
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

      if (diffInDays >= 7) {
        promises.push(
          db.collection("middle-articles").doc(d.id).update({
            deleted: true,
          })
        );
      }
    });
    docs = await db.collection("right-articles").get();
    docs.forEach((d) => {
      let data = d.data();
      let newDate = new Date(data.date.toDate());
      let today = new Date().toISOString().slice(0, 10);

      const startDate = newDate;
      const endDate = today;

      const diffInMs = new Date(endDate) - new Date(startDate);
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

      if (diffInDays >= 7) {
        promises.push(
          db.collection("right-articles").doc(d.id).update({
            deleted: true,
          })
        );
      }
    });

    Promise.all(promises).then(() => resolve());
  });
}

async function getSources() {
  let leftDocs = await db.collection("left-sources").get();
  let midDocs = await db.collection("middle-sources").get();
  let rightDocs = await db.collection("right-sources").get();

  leftDocs.forEach((d) => sources.push(d.data().url));
  midDocs.forEach((d) => sources.push(d.data().url));
  rightDocs.forEach((d) => sources.push(d.data().url));
}

const runtimeOpts = {
  timeoutSeconds: 540,
  memory: "1GB",
};

exports.deleteTrending = functions
  .runWith(runtimeOpts)
  .pubsub.schedule("every 24 hours")
  .onRun(async (context) => {
    let promise = [deleteOldArticles()];
    return Promise.all(promise);
  });
exports.deleteFeed = functions
  .runWith(runtimeOpts)
  .pubsub.schedule("every 24 hours")
  .onRun(async (context) => {
    let promise = [deleteMyFeedArticles()];
    return Promise.all(promise);
  });

async function doReplyNotifification(change, articleId) {
  let userId = change.after.data().uid;
  let comments = change.after.data().comments;

  console.log('USER ID: ', userId);
  console.log('COMMENTS: ', comments);

  // Find article UID
  const collections = ['left-articles', 'right-articles', 'middle-articles', 'trending-articles', 'category-articles'];
  let articleData = null;
  let articleUID = '';
  let col = null;

  // Loop through each collection and check for the article
  for (const collection of collections) {
    const doc = await admin.firestore().collection(collection).doc(articleId).get();
    if (doc.exists) {
      col = collection;
      articleData = doc.data();
      break; // Exit the loop if article is found
    }
  }

  if(articleData) articleUID = articleData.id;
  else articleUID = 'tab1';

  if (comments.length > 0) {
    let latestComment = comments[comments.length - 1];
    if (latestComment.uid !== userId) {
      let user = await db.collection("users").doc(userId).get();
      if (user.data().replyNotifications && user.data().token) {
        let payload = {
          token: user.data().token,
          notification: {
            title: "Reply",
            body: "A User Has Replied To Your Comment",
          },
          data: {
            category: col,
            url: articleUID,
          },
        };
        console.log("sending payload: ", payload);
        await admin.messaging().send(payload);
      }
    }
  }
}

async function doDailyReminder() {
  return new Promise(async (resolve, reject) => {
    try {
      let usersRef = await db.collection("users").get();

      let promises = [];
      usersRef.forEach((u) => {
        let user = u.data();

        if (user.lastSeen && user.reminderNotifications) {
          let lastSeen = new Date(user.lastSeen.toDate());

          let today = new Date();

          const startDate = lastSeen;
          const endDate = today;
          if (
            startDate.getFullYear() === endDate.getFullYear() &&
            startDate.getMonth() === endDate.getMonth() &&
            startDate.getDate() === endDate.getDate()
          ) {
            // Do nothing
            console.log("Doing nothing");
          } else if (user.token) {
            let payload = {
              token: user.token,
              notification: {
                title: "We Miss You!",
                body: "Open up your app to catch up on missed news!",
              },
              data: {
                url: "tab4",
              },
            };
            console.log("Sending");
            console.log(payload);
            promises.push(admin.messaging().send(payload));
            promises.push(
              db.collection("users").doc(u.id).update({
                lastSeen: new Date(),
              })
            );
          }
        }
      });

      Promise.all(promises).then(() => resolve());
    } catch (error) {
      console.log(error);
      reject();
    }
  });
}

async function doDailyGPT() {
  return new Promise(async (resolve, reject) => {
    try {
      let usersRef = await db.collection("users").get();

      let promises = [];
      usersRef.forEach((u) => {
        let user = u.data();

        if (user.token && user.GPTSummariesNotification) {

            let payload = {
              token: user.token,
              notification: {
                title: "New GPT Summaries!",
                body: "Click to check out todays new GPT summaries.",
              },
              data: {
                url: "tab4",
              },
            };
            console.log("Sending GPT notification to ", user.email);
            console.log(payload);
            promises.push(admin.messaging().send(payload));
          }
      });

      Promise.all(promises).then(() => resolve());
    } catch (error) {
      console.log(error);
      reject();
    }
  });
}

async function doDailyArticlesByTopic() {
  return new Promise(async (resolve) => {
    let promises = [];

    let querySnapshot = await db
      .collection("users")
      .where("reminderNotifications", "==", true)
      .get();
    querySnapshot.forEach((u) => {
      let user = u.data();
      if (user.token && user.topics.length > 0) {
        //Get random topic
        let randomIndex = Math.floor(Math.random() * user.topics.length);
        let randomTopic = user.topics[randomIndex];
        console.log(randomTopic);

        let documentCount = 0;

        // Get the current timestamp from Firestore
        const currentTimeStamp = Timestamp.now();

        // Calculate the timestamp for twenty-four hours ago
        const twentyFourHoursAgo = new Timestamp(
          currentTimeStamp.seconds - 24 * 60 * 60,
          currentTimeStamp.nanoseconds
        );

        // Query the Firestore collections
        const collections = [
          "left-articles",
          "middle-articles",
          "right-articles",
        ];

        // Create a function that wraps the asynchronous forEach loop in a Promise
        const processCollections = async () => {
          const promises = [];
          collections.forEach(async (collectionName) => {
            const promise = db
              .collection(collectionName)
              .orderBy("timestamp", "desc")
              .where("timestamp", ">=", twentyFourHoursAgo)
              .where("topic", "==", randomTopic.id)
              .get()
              .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                  // Increment the counter variable
                  documentCount++;
                });
                console.log("Finished counting docs in collection");
              })
              .catch((error) => {
                console.log("Error getting documents: ", error);
              });

            promises.push(promise);
          });

          // Wait for all the promises to resolve
          await Promise.all(promises);

          //Send actual notification to user
          let payload;
          if (documentCount == 0) {
            const randomNumber = Math.floor(Math.random() * 10) + 2;
            payload = {
              token: user.token,
              notification: {
                title: "New articles for you!",
                body:
                  randomNumber +
                  " new articles about " +
                  randomTopic.name +
                  "!",
              },
              data: {
                url: "tab1",
              },
            };
          } else {
            payload = {
              token: user.token,
              notification: {
                title: "New articles for you!",
                body:
                  documentCount +
                  " new articles about " +
                  randomTopic.name +
                  "!",
              },
              data: {
                url: "tab1",
              },
            };
          }
          console.log("Sending");
          promises.push(admin.messaging().send(payload));
        };
        // Call the function
        processCollections();
      }
    });

    Promise.all(promises).then(() => resolve());
  });
}

async function doDailyRandomArticle() {
  console.log("running daily random article...");

  let usersSnapshot = await db
    .collection("users")
    .where("randomArticleNotification", "==", true)
    .get();

  let notificationPromises = usersSnapshot.docs.map(async (u) => {
    let user = u.data();
    console.log(user.email);
    if (user.token) {
      // Get the current timestamp from Firestore
      const currentTimeStamp = Timestamp.now();

      // Calculate the timestamp for twenty-four hours ago
      const twentyFourHoursAgo = new Timestamp(
        currentTimeStamp.seconds - 24 * 60 * 60,
        currentTimeStamp.nanoseconds
      );

      let trendingArticles = await db
        .collection("trending-articles")
        .orderBy("timestamp", "desc")
        .where("timestamp", ">=", twentyFourHoursAgo)
        .get();

      const articlesList = [];
      trendingArticles.forEach((doc) => {
        articlesList.push(doc.data());
      });

      // Randomly select an article from the list
      const randomIndex = Math.floor(Math.random() * articlesList.length);
      const article = articlesList[randomIndex];
      console.log(article);

      // Prepare and send notification to the user
      const payload = {
        token: user.token,
        notification: {
          title: "New trending article!",
          body: article.title,
        },
        data: {
          url: article.id,
        },
      };

      console.log("Sending random article to", user.email);
      admin
        .messaging()
        .send(payload)
        .then((response) => {
          console.log("Successfully sent message:", response);
          return response; // This is optional, depending on your needs.
        })
        .catch((error) => {
          console.error("Error sending message:", error);
        });
    }
  });

  // Wait for all the notifications to be sent and resolve once done
  console.log("waiting");
  await Promise.all(notificationPromises);
}

// This will get called when a new doc is added to the community-feed collection.
// It will check if the article contains a image and create one if not.
async function checkIfArticleNeedsImage(articleId) {  
  console.log('Checking if this article needs an image: ', articleId);

  const docRef = db.collection('community-feed').doc(articleId);
  try {
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      const articleData = docSnap.data();
      if (!articleData.image) {
        console.log('No image found, generating image...');
        // Call generateImage function here
        const articleSummary = articleData.summary;
        const aiImage = await generateImage(articleSummary, articleId);
        await db.collection('community-feed').doc(articleId).update({image: aiImage});

      } else {
        console.log('Image already exists for this article.');
      }
    } else {
      console.log('No such article found.');
    }
  } catch (error) {
    console.error('Error fetching article: ', error);
  }
}
async function generateImage(articleSummary, articleId) {
  // Ensure the text is not too long
  const maxLength = 4000; // Adjust based on your API's requirements
  const trimmedText =
  articleSummary.length > maxLength ? articleSummary.substring(0, maxLength) : articleSummary;
  try {
    console.log("REQUESTING IMAGE");
    // Make the POST request to the API
    const response = await openai.images.generate({
      prompt: trimmedText,
      model: "dall-e-3",
    });

    // Handle the response
    if (response.data) {
      // Upload image to firebase
      const uploadURL = await uploadImageToFirebase(response.data[0].url, `community-feed/${articleId}`);
      return uploadURL;
    } else {
      throw new Error("Unexpected response structure from API");
    }
  } catch (error) {
    console.log(error);
    if (error.error.code == "rate_limit_exceeded") {
      return await generateImage(articleSummary);
    } else if (error.error.code == "content_policy_violation") {
      const kidSafeText = await getSafeSummaryForChildren(trimmedText);
      return await generateImage(kidSafeText, articleId);
    } else {
      console.error("Error generating image from text:", error);
      throw error;
    }
  }
}
async function getSafeSummaryForChildren(text) {
  const prompt = `Please summarize the following text in a child-friendly manner:\n\n${text}`;
  try {
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });

    const response = chatCompletion.choices[0].message.content;
    return response;
  } catch (error) {
    console.error("Error generating child-safe summary:", error);
    throw error;
  }
}
async function downloadImage(url) {
  console.log('Downloading image from: ', url);
  const response = await fetch(url);
  const buffer = await response.buffer();
  return buffer;
}
async function uploadImageToFirebase(url, destinationPath) {
  const imageBuffer = await downloadImage(url);
  const file = bucket.file(destinationPath);
  await file.save(imageBuffer, {
    metadata: { 
      contentType: 'image/jpeg',
      metadata: {
        uploadedTime: new Date().toISOString()
      }
   },
  });
  await file.makePublic();
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;
  console.log(`Uploaded image to ${publicUrl}`);
  return publicUrl;
}

exports.sendResponseNotificationLeft = functions
  .runWith(runtimeOpts)
  .firestore.document("/left-articles/{articleId}/comments/{commentId}")
  .onUpdate((change, context) => {
    // Extract the articleId from the context
    const articleId = context.params.articleId;

    let promise = [doReplyNotifification(change, articleId)];
    return Promise.all(promise);
  });
exports.sendResponseNotificationMiddle = functions
  .runWith(runtimeOpts)
  .firestore.document("/middle-articles/{articleId}/comments/{commentId}")
  .onUpdate((change, context) => {
    // Extract the articleId from the context
    const articleId = context.params.articleId;

    let promise = [doReplyNotifification(change, articleId)];
    return Promise.all(promise);
  });
exports.sendResponseNotificationRight = functions
  .runWith(runtimeOpts)
  .firestore.document("/right-articles/{articleId}/comments/{commentId}")
  .onUpdate((change, context) => {
    // Extract the articleId from the context
    const articleId = context.params.articleId;

    let promise = [doReplyNotifification(change, articleId)];
    return Promise.all(promise);
  });
exports.sendResponseNotificationTrending = functions
  .runWith(runtimeOpts)
  .firestore.document("/trending-articles/{articleId}/comments/{commentId}")
  .onUpdate((change, context) => {
    // Extract the articleId from the context
    const articleId = context.params.articleId;

    let promise = [doReplyNotifification(change, articleId)];
    return Promise.all(promise);
  });

exports.sendResponseNotificationCategory = functions
  .runWith(runtimeOpts)
  .firestore.document("/category-articles/{articleId}/comments/{commentId}")
  .onUpdate((change, context) => {
    // Extract the articleId from the context
    const articleId = context.params.articleId;

    let promise = [doReplyNotifification(change, articleId)];
    return Promise.all(promise);
  });

exports.sendDailyReminder = functions
  .runWith(runtimeOpts)
  .pubsub.schedule("0 12 * * *")
  .onRun(async (context) => {
    let promise = [doDailyReminder()];
    return await Promise.all(promise);
  });

exports.dailyArticlesByTopic = functions
  .runWith(runtimeOpts)
  .pubsub.schedule("0 11 * * *")
  .onRun(async (context) => {
    let promise = [doDailyArticlesByTopic()];
    return await Promise.all(promise);
  });

exports.dailyRandomArticle = functions
  .runWith(runtimeOpts)
  .pubsub.schedule("0 10 * * *")
  .onRun(async (context) => {
    let promise = [doDailyRandomArticle()];
    return Promise.all(promise);
  });

exports.dailyGPTSummaries = functions
  .runWith(runtimeOpts)
  .pubsub.schedule("0 5 * * *")
  .onRun(async (context) => {
    let promise = [doDailyGPT()];
    return Promise.all(promise);
  });

  // Community Feed functions
  exports.checkNewCommunityFeedArticleForImage = functions
  .runWith(runtimeOpts)
  .firestore.document("/community-feed/{articleId}")
  .onCreate((change, context) => {
    // Extract the articleId from the context
    const articleId = context.params.articleId;

    let promise = [checkIfArticleNeedsImage(articleId)];
    return Promise.all(promise);
  });

  
  // Deletes all gpt summary ai images older than 24 hours once every day
  exports.deleteOldGptImages= functions.pubsub.schedule("0 7 * * *").onRun(async (context) => {
    console.log('Running auto deletion for Community Feed images')
    const prefix = 'gpt-summaries/';  // Folder path in the bucket
    const [files] = await bucket.getFiles({ prefix: prefix });
  
    files.forEach(async file => {
      const [metadata] = await file.getMetadata();
      const uploadedTime = metadata.metadata && metadata.metadata.uploadedTime;
      if (uploadedTime) {
        const fileAge = Date.now() - new Date(uploadedTime).getTime();
        const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
        if (fileAge > twentyFourHoursInMs) {
          await file.delete();
          console.log(`Deleted old file: ${file.name}`);
        }
      }
    });
  });


