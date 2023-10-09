import express from 'express';
import { initializeWidgetTemplate, widgetCustomLink, widgetSSEAuth, widgetSSEConnection, widgetStyling, saveWidgetStyling } from '../controllers/widgetControllers.js';
const router = express.Router();

router.get('/link', widgetCustomLink);

router.post('/sse-auth', widgetSSEAuth);

router.get('/sse-connection', widgetSSEConnection);

router.get('/style-:userhash', widgetStyling);

router.post('/save', saveWidgetStyling);

router.get('/:userhash', initializeWidgetTemplate);

export default router;