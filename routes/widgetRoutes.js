import express from 'express';
import { initializeWidget, widgetCustomLink, widgetSSEAuth, widgetSSEConnection, widgetStyling, saveWidgetStyling } from '../controllers/widgetControllers.js';
import { VerifyToken } from '../middleware/authHandle.js';
const router = express.Router();

router.get('/link', VerifyToken, widgetCustomLink);

router.post('/sse-auth', widgetSSEAuth);

router.get('/sse-connection', widgetSSEConnection);

router.get('/style-:userhash', widgetStyling);

router.post('/save', saveWidgetStyling);

router.get('/:userhash', initializeWidget);

export default router;