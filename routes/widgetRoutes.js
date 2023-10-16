import express from 'express';
import { initializeWidgetTemplate, widgetCustomLink, widgetSSEAuth, widgetSSEConnection, widgetStyling, saveWidgetStyling } from '../controllers/widgetControllers.js';
const router = express.Router();

router.get('/link', widgetCustomLink);

router.post('/sse-auth', widgetSSEAuth);

router.get('/sse-connection', widgetSSEConnection);

router.get('/style-:user_hash', widgetStyling);

router.post('/save', saveWidgetStyling);

router.get('/:user_hash', initializeWidgetTemplate);

export default router;