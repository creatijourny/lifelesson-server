const express = require('express');
const cors = require('cors');
const app = express()
const port = 5000
require('dotenv').config();

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');

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

// New code Verify Token
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).send({
        message: "Unauthorized",
      });
    }

    const token = authHeader.split(" ")[1];

    const { payload } = await jwtVerify(token, JWKS);

    req.user = payload;

    next();
  } catch (error) {
    return res.status(401).send({
      message: "Unauthorized",
    });
  }
};

// verifyAdmin
const verifyAdmin = (req, res, next) => {
  if (!req.user) {
    return res
      .status(401)
      .send({ message: "Unauthorized" });
  }

  if (req.user.role !== "admin") {
    return res
      .status(403)
      .send({
        message: "Admin access required",
      });
  }

  next();
};

// verifyPremium
const verifyPremium = (req, res, next) => {
  if (!req.user) {
    return res
      .status(401)
      .send({ message: "Login required" });
  }

  if (req.user.plan !== "premium") {
    return res
      .status(403)
      .send({
        message:
          "Premium subscription required",
      });
  }

  next();
};

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
    const { search, category, page, limit } = req.query;

    // const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    // const perPage = Math.min(
    //   Math.max(parseInt(limit, 10) || 9, 1),
    //   50
    // );

    // const skip = (currentPage - 1) * perPage;

    // const filter = {
    //   visibility: "Public",
    // };

    // // Search by title
    // if (search) {
    //   filter.title = {
    //     $regex: search,
    //     $options: "i",
    //   };
    // }

    // // Filter by category
    // if (category) {
    //   filter.category = category;
    // }

    // const total = await lessonCollection.countDocuments(
    //   filter);
    

    // const lessons = await lessonCollection
    //   .find(filter)
    //   .sort({ _id: -1 })
    //   .skip(skip),
    //   .limit(perPage)
    //   .toArray();

    // res.send(lessons);

    // New code
    const currentPage = Math.max(
  parseInt(page, 10) || 1,
  1
);

const perPage = Math.min(
  Math.max(parseInt(limit, 10) || 9, 1),
  50
);

// const skip = (currentPage - 1) * perPage;
const skip = (page - 1) * limit;

const filter = {
  visibility: "Public",
};

if (search && search.trim()) {
  filter.title = {
    $regex: search.trim(),
    $options: "i",
  };
}

if (category && category.trim()) {
  filter.category = category.trim();
}

const total = await lessonCollection.countDocuments(filter);

const lessons = await lessonCollection
  .find(filter)
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(perPage)
  .toArray();

const totalPages = Math.ceil(
  total / limit);

res.send({
  lessons,
  pagination: {
    currentPage: page,
    perPage: limit,
    total,
    totalPages,
    hasNextPage:
      page < totalPages,
    hasPreviousPage:
      page > 1,
  },
});

  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch lessons",
      error: error.message,
    });
  }
});


app.get("/api/lessons/:id", verifyToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      const lesson = await lessonCollection.findOne({
        _id: new ObjectId(id),
      });

      if (!lesson) {
        return res.status(404).send({
          message: "Lesson not found",
        });
      }

      const isOwner =
        req.user.id === lesson.authorId;

      const isAdmin =
        req.user.role === "admin";

      const isPremium =
        req.user.plan === "premium";

      // Premium restriction
      if (
        lesson.accessLevel === "Premium" &&
        !isOwner &&
        !isAdmin &&
        !isPremium
      ) {
        return res.status(403).send({
          message:
            "Premium membership required.",
        });
      }

      res.send(lesson);
    } catch (error) {
      console.error(
        "GET LESSON ERROR:",
        error
      );

      res.status(500).send({
        message:
          "Failed to fetch lesson",
        error: error.message,
      });
    }
  }
);

    // New app.post
    app.post(
  "/api/lessons",
  verifyToken,
  async (req, res) => {
    try {
      
      const authUser = req.user;
      
      const user = await userCollection.findOne({
        _id: new ObjectId(authUser.id),
      });

      if (!user) {
        return res.status(404).send({
          message: "User not found",
        });
      }
      
      if (
        req.body.accessLevel === "Premium" &&
        user.plan !== "premium"
      ) {
        return res.status(403).send({
          message:
            "Only Premium members can create Premium lessons.",
        });
      }
      
      const lesson = {
        ...req.body,

        // Never trust client-sent author info
        authorId: authUser.id,
        authorName: user.name,
        authorEmail: user.email,

        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result =
        await lessonCollection.insertOne(
          lesson
        );

      res.send({
        message:
          "Lesson created successfully.",
        insertedId: result.insertedId,
      });
    } catch (error) {
      console.error(
        "CREATE LESSON ERROR:",
        error
      );

      res.status(500).send({
        message:
          "Failed to create lesson",
        error: error.message,
      });
    }
  }
);

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

// Dashboard Admin Home
app.get("/api/admin/dashboard", async (req, res) => {
  try {
    const totalUsers =
      await userCollection.countDocuments();

      const totalPublicLessons =
      await lessonCollection.countDocuments({
        visibility: "Public",
      });

      const totalReportedLessons =
      await reportCollection.countDocuments();

      // Today's New Lessons
      const startOfToday = new Date();

    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();

    endOfToday.setHours(23, 59, 59, 999);

    const todaysNewLessons =
      await lessonCollection.countDocuments({
        createdAt: {
          $gte: startOfToday,
          $lte: endOfToday,
        },
      });

      // Active contributors
      const mostActiveContributors =
      await lessonCollection
        .aggregate([
          {
            $match: {
              authorId: {
                $exists: true,
                $ne: null,
              },
            },
          },

          {
            $group: {
              _id: "$authorId",
              lessonCount: {
                $sum: 1,
              },
            },
          },
          {
            $sort: {
              lessonCount: -1,
            },
          },

          {
            $limit: 5,
          },
        ])
        .toArray();

         const contributors =
      await Promise.all(
        mostActiveContributors.map(
          async (item) => {

            let user = null;

            try {
              user =
                await userCollection.findOne({
                  _id: new ObjectId(
                    item._id
                  ),
                });
            } catch {
              // authorId may not be ObjectId
            }

             return {
              userId: item._id,
              name:
                user?.name ||
                "Unknown User",
              email:
                user?.email || "",
              image:
                user?.image || "",
              lessonCount:
                item.lessonCount,
            };
          }
        )
      );

      // Lesson Growth Last 12 Months

      const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]; 

const lessonGrowth =
  await lessonCollection
    .aggregate([
      {
        $match: {
          createdAt: {
            $exists: true,
            $ne: null,
          },
        },
      },

      {
        $addFields: {
          growthDate: {
            $convert: {
              input: "$createdAt",
              to: "date",
              onError: null,
              onNull: null,
            },
          },
        },
      },

      {
        $match: {
          growthDate: {
            $ne: null,
          },
        },
      },

      {
        $group: {
          _id: {
            year: {
              $year: "$growthDate",
            },
            month: {
              $month: "$growthDate",
            },
          },

          lessons: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },

      {
        $limit: 12,
      },
    ])
    .toArray();

// User Growth - Last 12 Months

const userGrowth =
  await userCollection
    .aggregate([
      {
        $match: {
          createdAt: {
            $exists: true,
            $ne: null,
          },
        },
      },

      {
        $addFields: {
          growthDate: {
            $convert: {
              input: "$createdAt",
              to: "date",
              onError: null,
              onNull: null,
            },
          },
        },
      },

      {
        $match: {
          growthDate: {
            $ne: null,
          },
        },
      },

      {
        $group: {
          _id: {
            year: {
              $year: "$growthDate",
            },
            month: {
              $month: "$growthDate",
            },
          },

          users: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          "_id.year": 1,
          "_id.month": 1,
        },
      },

      {
        $limit: 12,
      },
    ])
    .toArray();

  const formattedLessonGrowth =
  lessonGrowth.map((item) => ({
    month:
      monthNames[item._id.month - 1],
    lessons: item.lessons,
  }));


const formattedUserGrowth =
  userGrowth.map((item) => ({
    month:
      monthNames[item._id.month - 1],
    users: item.users,
  }));   

    // New res.send
  res.send({
  totalUsers,
  totalPublicLessons,
  totalReportedLessons,
  todaysNewLessons,

  mostActiveContributors: contributors,

  lessonGrowth: formattedLessonGrowth,

  userGrowth: formattedUserGrowth,
});

  } catch (error) {

    console.error(
      "Admin dashboard error:",
      error
    );

    res.status(500).send({
      message:
        "Failed to load admin dashboard",
      error: error.message,
    });
  }
});

// GET ADMIN USERS

app.get("/api/admin/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const users = await userCollection
      .aggregate([
        {
         $lookup: {
    from: "lessons",
    let: {
      userId: { $toString: "$_id" },
    },
    pipeline: [
      {
        $match: {
          $expr: {
            $eq: [
              "$authorId",
              "$$userId",
            ],
          },
        },
      },
      {
        $count: "count",
      },
    ],
    as: "lessonStats",
  },
},
{
  $addFields: {
    totalLessons: {
      $ifNull: [
        {
          $arrayElemAt: [
            "$lessonStats.count",
            0,
          ],
        },
        0,
      ],
    },
  },
},

        {
          $project: {
            name: 1,
            email: 1,
            role: 1,
            plan: 1,
            totalLessons: 1,
            
          },
        },

        {
          $sort: {
            name: 1,
          },
        },
      ])
      .toArray();

    res.send(users);

  } catch (error) {
    console.error(
      "GET ADMIN USERS ERROR:",
      error
    );

    res.status(500).send({
      message: "Failed to load users",
      error: error.message,
    });
  }
});

// UPDATE USER ROLE
app.patch(
  "/api/admin/users/:id/role", verifyToken, verifyAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!["user", "admin"].includes(role)) {
        return res.status(400).send({
          message: "Invalid role.",
        });
      }

      if (req.user.id === id) {
        return res.status(400).send({
          message:
            "You cannot change your own role.",
        });
      }

      const result =
        await userCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              role,
            },
          }
        );

      if (result.matchedCount === 0) {
        return res.status(404).send({
          message: "User not found.",
        });
      }

      res.send({
        message: "User role updated successfully.",
        result,
      });

    } catch (error) {
      console.error(
        "UPDATE USER ROLE ERROR:",
        error
      );

      res.status(500).send({
        message: "Failed to update user role",
        error: error.message,
      });
    }
  }
);

// Manage Lessons
app.get("/api/admin/lessons", verifyToken, verifyAdmin, async (req, res) => {
  try {
    
    const {
      search,
      category,
      visibility,
      flagged,
    } = req.query;

    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (visibility) {
      filter.visibility = visibility;
    }

    if (flagged === "true") {
      filter.$or = [
        { flagged: true },
        { flags: { $exists: true, $ne: [] } },
      ];
    }

    const page = Math.max(
      parseInt(req.query.page) || 1,
      1
    );

    const perPage = Math.max(
      parseInt(req.query.perPage) || 10,
      1
    );

    const skip =
      (page - 1) * perPage;

    const totalLessons =
      await lessonCollection.countDocuments(
        filter
      );

      const totalPages = Math.ceil(
  totalLessons / perPage
);

    const lessons = await lessonCollection
      .aggregate([
        {
          $match: filter,
        },

        {
          $lookup: {
            from: "user",
            localField: "authorId",
            foreignField: "_id",
            as: "author",
          },
        },

        {
          $unwind: {
            path: "$author",
            preserveNullAndEmptyArrays: true,
          },
        },

        {
          $project: {
            title: 1,
            description: 1,
            category: 1,
            tone: 1,
            visibility: 1,
            accessLevel: 1,
            featured: {
              $ifNull: ["$featured", false],
            },
            reviewed: {
              $ifNull: ["$reviewed", false],
            },
            flagged: {
              $ifNull: ["$flagged", false],
            },
            flags: 1,
            createdAt: 1,

            authorName: {
              $ifNull: [
                "$author.name",
                "$authorName",
              ],
            },

            authorEmail: "$author.email",
          },
        },

        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $skip: skip,
        },

        {
          $limit: perPage,
        },
      ])
      .toArray();


    // Stats
    const publicLessons =
      await lessonCollection.countDocuments({
        visibility: "Public",
      });

    const privateLessons =
      await lessonCollection.countDocuments({
        visibility: "Private",
      });


    res.send({
      lessons,
      // Pagination
      pagination: {
        totalLessons,
        currentPage: page,
        perPage,
        totalPages,
      },

      stats: {
        publicLessons,
        privateLessons,
      },
    });

    console.log({
  page,
  perPage,
  skip,
  totalLessons,
  totalPages,
  returnedLessons: lessons.length,
});

  } catch (error) {
    console.error(
      "GET ADMIN LESSONS ERROR:",
      error
    );

    res.status(500).send({
      message: "Failed to load admin lessons",
      error: error.message,
    });
  }
});


app.delete("/api/admin/lessons/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      const result =
        await lessonCollection.deleteOne({
          _id: new ObjectId(id),
        });

      if (result.deletedCount === 0) {
        return res.status(404).send({
          message: "Lesson not found.",
        });
      }

      res.send({
        message:
          "Lesson deleted successfully.",
      });

    } catch (error) {
      console.error(
        "DELETE ADMIN LESSON ERROR:",
        error
      );

      res.status(500).send({
        message: "Failed to delete lesson",
        error: error.message,
      });
    }
  }
);

app.patch("/api/admin/lessons/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        featured,
        reviewed,
      } = req.body;

      const updateFields = {};

      if (
        typeof featured === "boolean"
      ) {
        updateFields.featured = featured;
      }

      if (
        typeof reviewed === "boolean"
      ) {
        updateFields.reviewed = reviewed;
      }

      if (
        Object.keys(updateFields).length === 0
      ) {
        return res.status(400).send({
          message:
            "No valid update provided.",
        });
      }

      const result =
        await lessonCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: updateFields,
          }
        );

      if (result.matchedCount === 0) {
        return res.status(404).send({
          message: "Lesson not found.",
        });
      }

      res.send({
        message:
          "Lesson updated successfully.",
        result,
      });

    } catch (error) {
      console.error(
        "UPDATE ADMIN LESSON ERROR:",
        error
      );

      res.status(500).send({
        message: "Failed to update lesson",
        error: error.message,
      });
    }
  }
);

// Admin Lesson
app.post(
  "/api/admin/lessons",
  async (req, res) => {
    try {
      const {
        title,
        description,
        category,
        tone,
        visibility,
        accessLevel,
      } = req.body;

      if (
        !title ||
        !description ||
        !category
      ) {
        return res.status(400).send({
          message:
            "Title, description and category are required.",
        });
      }

      const lesson = {
        title,
        description,
        category,
        tone: tone || "",

        visibility:
          visibility || "Public",

        accessLevel:
          accessLevel || "Free",

        featured: false,
        reviewed: true,
        flagged: false,       

        createdAt: new Date(),
      };

      const result =
        await lessonCollection.insertOne(
          lesson
        );

      res.status(201).send({
        message:
          "Lesson created successfully.",
        lessonId: result.insertedId,
      });

    } catch (error) {
      console.error(
        "ADMIN CREATE LESSON ERROR:",
        error
      );

      res.status(500).send({
        message:
          "Failed to create lesson",
        error: error.message,
      });
    }
  }
);

// Admin actions Free-Premium
// app.patch(
//   "/api/admin/lessons/:id/access-level",
//   async (req, res) => {
//     try {

//       // Verify authentication
//       const user = req.user;

//       if (!user) {
//         return res.status(401).send({
//           message: "Unauthorized",
//         });
//       }

//       // 2. Verify admin role
//       if (user.role !== "admin") {
//         return res.status(403).send({
//           message: "Admin access required",
//         });
//       }

//       const { id } = req.params;
//       const { accessLevel } = req.body;

//       if (
//         !["Free", "Premium"].includes(
//           accessLevel
//         )
//       ) {
//         return res.status(400).send({
//           message:
//             "Invalid access level",
//         });
//       }

//       const result =
//         await lessonCollection.updateOne(
//           {
//             _id: new ObjectId(id),
//           },
//           {
//             $set: {
//               accessLevel,
//               updatedAt: new Date(),
//             },
//           }
//         );

//       if (result.matchedCount === 0) {
//         return res.status(404).send({
//           message: "Lesson not found",
//         });
//       }

//       res.send({
//         message:
//           "Lesson access level updated.",
//         accessLevel,
//       });

//     } catch (error) {
//       console.error(
//         "UPDATE ACCESS LEVEL ERROR:",
//         error
//       );

//       res.status(500).send({
//         message:
//           "Failed to update lesson access level",
//         error: error.message,
//       });
//     }
//   }
// );

// New code (works well without JWT)
app.patch(
  "/api/admin/lessons/:id/access-level",
  async (req, res) => {
    try {
      const { id } = req.params;
      const { accessLevel } = req.body;

      if (
        !["Free", "Premium"].includes(
          accessLevel
        )
      ) {
        return res.status(400).send({
          message:
            "Invalid access level",
        });
      }

      const result =
        await lessonCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              accessLevel,
              updatedAt: new Date(),
            },
          }
        );

      if (result.matchedCount === 0) {
        return res.status(404).send({
          message: "Lesson not found",
        });
      }

      res.send({
        message:
          "Lesson access level updated.",
        accessLevel,
      });
    } catch (error) {
      console.error(
        "UPDATE ACCESS LEVEL ERROR:",
        error
      );

      res.status(500).send({
        message:
          "Failed to update lesson access level",
        error: error.message,
      });
    }
  }
);

// Reported Lessons
app.get(
  "/api/admin/reported-lessons",
  async (req, res) => {
    try {
      const groupedReports =
        await lessonReportsCollection
          .aggregate([
            {
              $group: {
                _id: "$lessonId",

                reportCount: {
                  $sum: 1,
                },

                reports: {
                  $push: {
                    _id: "$_id",
                    reporterUserId:
                      "$reporterUserId",
                    reporterEmail:
                      "$reporterEmail",
                    reason: "$reason",
                    createdAt:
                      "$createdAt",
                  },
                },
              },
            },

            {
              $sort: {
                reportCount: -1,
              },
            },
          ])
          .toArray();

      const lessonIds =
        groupedReports.map(
          (item) => item._id
        );

      const lessons =
        await lessonCollection
          .find({
            _id: {
              $in: lessonIds,
            },
          })
          .toArray();

      const lessonMap =
        new Map(
          lessons.map((lesson) => [
            lesson._id.toString(),
            lesson,
          ])
        );

      const reportedLessons =
        groupedReports
          .map((reportGroup) => {
            const lesson =
              lessonMap.get(
                reportGroup._id.toString()
              );

            if (!lesson) {
              return null;
            }

            return {
              ...lesson,

              reportCount:
                reportGroup.reportCount,

              reports:
                reportGroup.reports,
            };
          })
          .filter(Boolean);

      res.send({
        lessons: reportedLessons,
      });
    } catch (error) {
      console.error(
        "GET REPORTED LESSONS ERROR:",
        error
      );

      res.status(500).send({
        message:
          "Failed to load reported lessons",
        error: error.message,
      });
    }
  }
);

// Delete Lesson
app.delete(
  "/api/admin/reported-lessons/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      const result =
        await lessonCollection.deleteOne({
          _id: new ObjectId(id),
        });

      if (result.deletedCount === 0) {
        return res.status(404).send({
          message:
            "Lesson not found",
        });
      }

      res.send({
        message:
          "Lesson permanently deleted.",
      });
    } catch (error) {
      console.error(
        "DELETE REPORTED LESSON ERROR:",
        error
      );

      res.status(500).send({
        message:
          "Failed to delete lesson",
        error: error.message,
      });
    }
  }
);

// Ignore Reports
app.patch(
  "/api/admin/reported-lessons/:id/ignore",
  async (req, res) => {
    try {
      const { id } = req.params;

      const result =
        await lessonCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              flagged: false,
              flags: [],
              updatedAt: new Date(),
            },
          }
        );

      if (result.matchedCount === 0) {
        return res.status(404).send({
          message:
            "Lesson not found",
        });
      }

      res.send({
        message:
          "Reports cleared successfully.",
      });
    } catch (error) {
      console.error(
        "IGNORE REPORTS ERROR:",
        error
      );

      res.status(500).send({
        message:
          "Failed to clear reports",
        error: error.message,
      });
    }
  }
);

// Featured lessons
app.get(
  "/api/featured-lessons",
  async (req, res) => {
    try {
      const lessons =
        await lessonCollection
          .find({
            featured: true,
            visibility: "Public",
          })
          .sort({ createdAt: -1 })
          .limit(6)
          .toArray();

      res.send(lessons);
    } catch (error) {
      console.error(
        "FEATURED LESSONS ERROR:",
        error
      );

      res.status(500).send({
        message:
          "Failed to load featured lessons",
        error: error.message,
      });
    }
  }
);
    
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
});