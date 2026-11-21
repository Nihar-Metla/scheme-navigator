import { createApp } from "./api/app.js";

const port = Number(process.env.PORT) || 3001;

createApp().listen(port, () => {
  console.log(`Haq Scholar server listening on port ${port}`);
});
