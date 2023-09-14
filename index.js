const dotenv = require('dotenv');
dotenv.config();

const { Client } = require('@notionhq/client');
const express = require('express');
const cors = require('cors');

const NOTION_API_KEY = process.env['NOTION_API_KEY'];
const DATABASE_ID = process.env['NOTION_DATABASE_ID'];

const notion = new Client({ auth: NOTION_API_KEY });

const app = express();
const PORT = 3000;

app.use(express.static('public'));

app.use(cors());

const fetchAllTasks = async () => {
  const response = await notion.databases.query({
    database_id: DATABASE_ID
  });

  return response.results;
};

const findFreeDesigner = async () => {
  const tasks = await fetchAllTasks();
  let designersTaskCount = new Map();

  for (const task of tasks) {
    const status = task.properties.Status.status.name;
    const assignedTo = task.properties["Assigned To"].people;
    const reviewer = task.properties.Reviewer.people;

    if (status === "In Progress" || status === "In Review") {
      // Increase the count of tasks for each assigned designer
      for (const designer of assignedTo) {
        designersTaskCount.set(designer.id, (designersTaskCount.get(designer.id) || 0) + 1);
      }

      // Increase the count of tasks for each reviewer
      for (const reviewerPerson of reviewer) {
        designersTaskCount.set(reviewerPerson.id, (designersTaskCount.get(reviewerPerson.id) || 0) + 1);
      }
    }
  }

  // Find the minimum task count
  const minTaskCount = Math.min(...designersTaskCount.values());

  // Filter designers with minimum tasks
  const leastBusyDesigners = [...designersTaskCount.entries()]
    .filter(([designerId, taskCount]) => taskCount === minTaskCount)
    .map(([designerId, _]) => designerId);

  return leastBusyDesigners;
};

app.get('/find-free-designer', async (req, res) => {
  console.log("Accessing /find-free-designer endpoint");
  const freeDesignerIds = await findFreeDesigner();

  if (freeDesignerIds.length > 0) {
    const randomFreeDesignerId = freeDesignerIds[Math.floor(Math.random() * freeDesignerIds.length)];

    // Get designer information
    const designerInfo = await notion.users.retrieve({ user_id: randomFreeDesignerId });

    res.json({
      name: designerInfo.name,
      avatar: designerInfo.avatar_url
    });
  } else {
    res.status(404).json({ error: "No free designers found." });
  }
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});