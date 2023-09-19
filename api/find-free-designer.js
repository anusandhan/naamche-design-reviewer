const { Client } = require('@notionhq/client');

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

const notion = new Client({ auth: NOTION_API_KEY });

module.exports = async (req, res) => {
  // Filter out tasks with "Archived" status
  const response = await notion.databases.query({
    database_id: DATABASE_ID,
    filter: {
      property: "Status",
      status: {
        does_not_equal: "Archived"
      }
    }
  });

  const tasks = response.results;
  
  // Dictionary to hold designer ID and their statuses count
  const designerStatusCounts = {};

  for (const task of tasks) {
    const status = task.properties.Status.status.name;
    const assignedToArray = task.properties["Assigned To"].people;

    for (const user of assignedToArray) {
      designerStatusCounts[user.id] = designerStatusCounts[user.id] || { inProgress: 0, notStartedOrInReview: 0 };

      if (status === "In Progress") {
        designerStatusCounts[user.id].inProgress++;
      } else if (status === "Not Started" || status === "In Review") {
        designerStatusCounts[user.id].notStartedOrInReview++;
      }
    }
  }

  // Find designers who have no "In Progress" tasks but have "Not Started" or "In Review" tasks
  const potentialFreeDesigners = Object.entries(designerStatusCounts).filter(([_, counts]) => {
    return counts.inProgress === 0 && counts.notStartedOrInReview > 0;
  });

  // If we find potential free designers, return a random one among them
  if (potentialFreeDesigners.length) {
    const randomDesignerId = potentialFreeDesigners[Math.floor(Math.random() * potentialFreeDesigners.length)][0];
    const userDetails = await notion.users.retrieve({ user_id: randomDesignerId });
    res.json({
      name: userDetails.name,
      avatar: userDetails.avatar_url
    });
  } else {
    res.status(404).json({ error: "No free designers found." });
  }
};