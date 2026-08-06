const express = require('express');
const cors = require('cors');
const app = express()
const port = 5000
require('dotenv').config();

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require("mongodb");

app.get('/', (req, res) => {
  res.send('Hello from life lesson!')
})



const uri = process.env.MONGO_DB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    const database = client.db("life_lesson_db");
    const lessonCollection = database.collection("lessons");
    const favoriteCollection = database.collection("favorites");
  const commentCollection = database.collection("comments");
  const reportCollection = database.collection("lessonReports");
  const userCollection = database.collection("user");
  const paymentCollection = database.collection("payments");
  const lessonReportsCollection =
  database.collection("lessonReports");

  // Payment
  app.post('/payment', async(req, res) => {
    const { user, session_id } = req.body;

    const pay_result = await paymentCollection.insertOne({userId: new ObjectId(user.id), session_id})

    const user_result = await userCollection.updateOne(
      {_id: new ObjectId(user.id)},
      {$set: {plan: "premium"}}
    );

    res.send({pay_result, user_result});


  })
   

    
app.get("/api/lessons", async (req, res) => {
  try {
    const { search, category } = req.query;

    const filter = {
      visibility: "Public",
    };

    // Search by title
    if (search) {
      filter.title = {
        $regex: search,
        $options: "i",
      };
    }

    // Filter by category
    if (category) {
      filter.category = category;
    }

    const lessons = await lessonCollection
      .find(filter)
      .sort({ _id: -1 })
      .toArray();

    res.send(lessons);

  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch lessons",
      error: error.message,
    });
  }
});

// get single lesson
app.get("/api/lessons/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const lesson = await lessonCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!lesson) {
      return res.status(404).send({
        message: "Lesson not found",
      });
    }
    const isPremium =
  user?.plan === "premium";

if (
  lesson.accessLevel === "Premium" &&
  !isOwner &&
  !isPremium
) {
  return res.status(403).send({
    message:
      "Premium membership required.",
  });
}

    res.send(lesson);

  } catch (error) {
    res.status(500).send({
      message: error.message,
    });
  }
});

  


    // New app.post
    app.post("/api/lessons", async (req, res) => {
  try {
    const lesson = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // const lesson = req.body;

// Verify author's current plan
const user = await userCollection.findOne({
  _id: new ObjectId(lesson.authorId),
});

if (!user) {
  return res.status(404).send({
    message: "User not found",
  });
}

if (
  lesson.accessLevel === "Premium" &&
  user.plan !== "premium"
) {
  return res.status(403).send({
    message:
      "Only Premium members can create Premium lessons.",
  });
}

    const result = await lessonCollection.insertOne(lesson);

    res.send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to create lesson",
      error: error.message,
    });
  }
});

app.get('/lessons', async(req, res) => {
  const result = await lessonCollection.find().toArray()

  res.send(result);
});

// Count lessons
app.get("/api/users/:id/lesson-count", async(req, res) => {
  const {id} = req.params;

  const totalLessons = await lessonCollection.countDocuments({
    authorId: id,
  });

  res.send({ totalLessons });
});

// Favorites collection API
app.post("/api/favorites", async (req, res) => {
  try {
    const favorite = req.body;

    favorite.lessonId = new ObjectId(favorite.lessonId);

    const exists = await favoriteCollection.findOne({
      lessonId: favorite.lessonId,
      userId: favorite.userId,
    });

    if (exists) {
      return res.status(409).send({
        message: "Already saved",
      });
    }

    favorite.createdAt = new Date();

    const result = await favoriteCollection.insertOne(favorite);

    res.send({
      success: true,
      insertedId: result.insertedId,
    });

  } catch (err) {
    console.error(err);

    res.status(500).send({
      message: err.message,
    });
  }
});


// Favorites count
// app.get("/api/favorites/count/:lessonId", async (req, res) => {
//   try {
//     const lessonId = req.params.lessonId;

//     const count = await favoriteCollection.countDocuments({
//       lessonId: new ObjectId(lessonId),
//     });

//     res.send({ count });

//   } catch (err) {
//     res.status(500).send({
//       message: err.message,
//     });
//   }
// });

app.get("/api/favorites/count/:lessonId", async (req, res) => {
  const count = await favoriteCollection.countDocuments({
    lessonId: new ObjectId(req.params.lessonId),
  });

  res.send({ count });
});



// check saved
app.get("/api/favorites/check/:lessonId/:userId", async (req, res) => {
  try {
    const { lessonId, userId } = req.params;

    const exists = await favoriteCollection.findOne({
      lessonId: new ObjectId(lessonId),
      userId,
    });

    res.send({
      saved: !!exists,
    });

  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
});

// Remove favorite
app.delete("/api/favorites", async (req, res) => {

  const userId = req.user.id;
  const { lessonId } = req.body;

    // const { lessonId, userId } = req.body;

    const result = await favoriteCollection.deleteOne({
    lessonId: new ObjectId(lessonId),
    userId,
});

    res.send({
  success: true,
  deleted: result.deletedCount,
});

});




// Toggle Like

app.patch("/api/lessons/:id/like", async (req, res) => {

    const lessonId = req.params.id;

    const { userId } = req.body;

    const lesson = await lessonCollection.findOne({

        _id: new ObjectId(lessonId)

    });

    if (!lesson) {

        return res.status(404).send({

            message: "Lesson not found"

        });

    }

    const alreadyLiked = lesson.likes?.includes(userId);

    if (alreadyLiked) {

        await lessonCollection.updateOne(

            {

                _id: new ObjectId(lessonId)

            },

            {

                $pull: {

                    likes: userId

                }

            }

        );

        return res.send({

            "liked": false,
  

        });

    }

    await lessonCollection.updateOne(

        {

            _id: new ObjectId(lessonId)

        },

        {

            $push: {

                likes: userId

            }

        }

    );

    res.send({

        "liked": true,
  

    });

});

// Report lesson
app.post("/api/reports", async (req, res) => {
  try {
    const report = req.body;

    report.lessonId = new ObjectId(report.lessonId);

    // Check BEFORE inserting
    const exists = await lessonReportsCollection.findOne({
      lessonId: report.lessonId,
      reporterUserId: report.reporterUserId,
    });

    if (exists) {
      return res.status(409).send({
        success: false,
        message: "You have already reported this lesson.",
      });
    }

    report.createdAt = new Date();

    const result = await lessonReportsCollection.insertOne(report);

    res.send({
      success: true,
      insertedId: result.insertedId,
    });

  } catch (err) {
    console.error(err);

    res.status(500).send({
      message: err.message,
    });
  }
});

// Comment API
app.post("/api/comments", async (req, res) => {

    const comment = req.body;

    comment.createdAt = new Date();

    const result = await commentCollection.insertOne(comment);

    res.send(result);

});



app.get("/api/comments/:lessonId", async (req, res) => {
  try {
    const { lessonId } = req.params;

    const comments = await commentCollection
      .find({
        lessonId: lessonId,
      })
      .sort({
        createdAt: -1,
      })
      .toArray();

    res.send(comments);

  } catch (err) {
    console.error(err);

    res.status(500).send({
      message: err.message,
    });
  }
});

app.get("/api/comments/count/:lessonId", async (req, res) => {
  try {
    const { lessonId } = req.params;

    const count = await commentCollection.countDocuments({
      lessonId: lessonId,
    });

    res.send({ count });

  } catch (err) {
    console.error(err);

    res.status(500).send({
      message: err.message,
    });
  }
});

app.patch("/api/comments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const result = await commentCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          text,
          updatedAt: new Date(),
        },
      }
    );

    res.send({
      success: true,
      modified: result.modifiedCount,
    });

  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
});

app.delete("/api/comments/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await commentCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.send({
      success: true,
      deleted: result.deletedCount,
    });

  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
});


// Dashboard
app.get("/api/dashboard/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Total lessons created by this user
    const totalLessons =
      await lessonCollection.countDocuments({
        authorId: userId,
      });

    // Public lessons
    const publicLessons =
      await lessonCollection.countDocuments({
        authorId: userId,
        visibility: "Public",
      });

    // Saved favorites
    const totalFavorites =
      await favoriteCollection.countDocuments({
        userId,
      });

    // Recent lessons
    const recentLessons =
      await lessonCollection
        .find({
          authorId: userId,
        })
        .sort({
          createdAt: -1,
        })
        .limit(5)
        .toArray();

    res.send({
      totalLessons,
      totalFavorites,
      publicLessons,
      recentLessons,
    });

  } catch (err) {

    res.status(500).send({
      message: err.message,
    });

  }
});

app.get("/api/dashboard/my-lessons/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Load all lessons of this user
    const lessons = await lessonCollection
      .find({
        authorId: userId,
      })
      .sort({
        createdAt: -1,
      })
      .toArray();

    // Calculate statistics for every lesson
    const lessonsWithStats = await Promise.all(
      lessons.map(async (lesson) => {
        const lessonId = lesson._id;

        const favoritesCount =
          await favoriteCollection.countDocuments({
            lessonId,
          });

        const commentsCount =
          await commentCollection.countDocuments({
            lessonId,
          });

        const likesCount =
          lesson.likes?.length || 0;

        return {
          ...lesson,

          likesCount,

          favoritesCount,

          commentsCount,

          reactionCount:
            likesCount +
            favoritesCount +
            commentsCount,
        };
      })
    );

    res.send(lessonsWithStats);

  } catch (err) {

    console.error(err);

    res.status(500).send({
      message: err.message,
    });

  }
});

// Update lesson

app.get("/api/dashboard/my-lessons/:id", async (req, res) => {
  // console.log("========== FIND ONE ROUTE ==========");
  // console.log("Requested id:", req.params.id);

  try {
    const lesson = await lessonCollection.findOne({
      _id: new ObjectId(req.params.id),
    });

    console.log("Mongo result:", lesson);

    res.send(lesson);

  } catch (err) {
    console.error(err);

    res.status(500).send({
      message: err.message,
    });
  }
});



app.put("/api/dashboard/my-lessons/:id", async (req, res) => {
  try {

    const id = req.params.id;

    const lesson = req.body;

    delete lesson._id;
    delete lesson.authorId;
    delete lesson.authorName;
    delete lesson.authorEmail;
    lesson.updatedAt = new Date();    

const user = await userCollection.findOne({
  _id: new ObjectId(lesson.authorId),
});

if (
  lesson.accessLevel === "Premium" &&
  user.plan !== "premium"
) {
  return res.status(403).send({
    message:
      "Only Premium members can create Premium lessons.",
  });
}


    const result =
      await lessonCollection.updateOne(
        {
          _id: new ObjectId(id),
        },
        {
          $set: lesson,
        }
      );

    res.send({
      success: true,
      modified: result.modifiedCount,
    });

  } catch (err) {

    res.status(500).send({
      message: err.message,
    });

  }
});

// Delete
app.delete("/api/dashboard/my-lessons/:id", async (req, res) => {
  try {

    const lessonId =
      new ObjectId(req.params.id);

    await favoriteCollection.deleteMany({
      lessonId,
    });

    await commentCollection.deleteMany({
      lessonId,
    });

    await lessonReportsCollection.deleteMany({
      lessonId,
    });

    const result =
      await lessonCollection.deleteOne({
        _id: lessonId,
      });

    res.send({
      success: true,
      deleted: result.deletedCount,
    });

  } catch (err) {

    res.status(500).send({
      message: err.message,
    });

  }
});

// Get Profile
// app.get("/api/profile/:userId", async (req, res) => {
//   try {
//     const { userId } = req.params;

//     const user = await userCollection.findOne({
//       _id: new ObjectId(userId),
//     });

//     if (!user) {
//       return res.status(404).send({
//         message: "User not found",
//       });
//     }

//     res.send(user);

//   } catch (err) {
//     res.status(500).send({
//       message: err.message,
//     });
//   }
// });

app.get("/api/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await userCollection.findOne(
      {
        _id: new ObjectId(userId),
      },
      {
        projection: {
          name: 1,
          email: 1,
          image: 1,
          role: 1,
          plan: 1,
          createdAt: 1,
        },
      }
    );

    if (!user) {
      return res.status(404).send({
        message: "User not found",
      });
    }

    res.send(user);

  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
});


// PATCH Profile

app.patch("/api/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const { name, image } = req.body;

    const result = await userCollection.updateOne(
      {
        _id: new ObjectId(userId),
      },
      {
        $set: {
          name,
          image,
          updatedAt: new Date(),
        },
      }
    );

    res.send({
      success: true,
      modified: result.modifiedCount,
    });

  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
});



// Profile Stats

app.get("/api/profile/stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const lessonsCreated =
      await lessonCollection.countDocuments({
        authorId: userId,
      });

    const savedLessons =
      await favoriteCollection.countDocuments({
        userId,
      });

    res.send({
      lessonsCreated,
      savedLessons,
    });

  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
});




app.get("/api/profile/lessons/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const lessons = await lessonCollection
      .find({
        authorId: userId,
        visibility: "Public",
      })
      .sort({
        createdAt: -1,
      })
      .toArray();

    res.send(lessons);

  } catch (err) {
    res.status(500).send({
      message: err.message,
    });
  }
});

    
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})