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

  let selectedDesignerId = null;

  // 1st Priority: Designers with tasks that are "Not Started" or "In Review" but not "In Progress"
  const potentialFreeDesigners = Object.entries(designerStatusCounts).filter(([_, counts]) => {
    return counts.inProgress === 0 && counts.notStartedOrInReview > 0;
  });

  if (potentialFreeDesigners.length) {
    selectedDesignerId = potentialFreeDesigners[Math.floor(Math.random() * potentialFreeDesigners.length)][0];
  }

  // 2nd Priority: Designers with the least number of "In Progress" tasks
  if (!selectedDesignerId) {
    const sortedDesigners = Object.entries(designerStatusCounts).sort((a, b) => a[1].inProgress - b[1].inProgress);
    selectedDesignerId = sortedDesigners[0] && sortedDesigners[0][0];
  }

  // 3rd Priority: A random designer
  if (!selectedDesignerId) {
    const allDesignerIds = Object.keys(designerStatusCounts);
    selectedDesignerId = allDesignerIds[Math.floor(Math.random() * allDesignerIds.length)];
  }

  if (selectedDesignerId) {
    const userDetails = await notion.users.retrieve({ user_id: selectedDesignerId });
    res.json({
      name: userDetails.name,
      avatar: userDetails.avatar_url
    });
  } else {
    res.status(404).json({ error: "No designers found." });
  }
};