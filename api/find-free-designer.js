const { Client } = require('@notionhq/client');

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

const notion = new Client({ auth: NOTION_API_KEY });

const fetchFreeDesignerNames = async () => {
  const response = await notion.databases.query({
    database_id: DATABASE_ID
  });

  const tasks = response.results;
  const designers = new Map();

  for (const task of tasks) {
    const statusObject = task.properties.Status.status;
    const assignedToArray = task.properties["Assigned To"].people;

    if (statusObject && assignedToArray && statusObject.name !== "In Review") {
      for (const user of assignedToArray) {
        designers.set(user.id, (designers.get(user.id) || 0) + 1);
      }
    }
  }

  const sortedDesigners = [...designers.entries()].sort((a, b) => a[1] - b[1]);

  const designerNames = [];
  for (const [designerId, _] of sortedDesigners) {
    const userDetails = await notion.users.retrieve({ user_id: designerId });
    designerNames.push({
      name: userDetails.name,
      avatar: userDetails.avatar_url
    });
  }

  return designerNames;
};

module.exports = async (req, res) => {
    const designerNames = await fetchFreeDesignerNames();

    if (designerNames && designerNames.length) {
        const randomFreeDesigner = designerNames[Math.floor(Math.random() * designerNames.length)];
        res.json({
            name: randomFreeDesigner.name,
            avatar: randomFreeDesigner.avatar
        });
    } else {
        res.status(404).json({ error: "No free designers found." });
    }
};
