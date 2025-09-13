// backend/routes/debugRoutes.js
const express = require("express");

function buildDebugRoutes({ eventBus }) {
    const router = express.Router();

    // SSE endpoint
    router.get("/events", (req, res) => {
        res.set({
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        });
        res.flushHeaders();

        const onDebugEvent = (data) => {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        // Subscribe to DEBUG_EVENT
        eventBus.on("DEBUG_EVENT", onDebugEvent);

        // Clean up when client disconnects
        req.on("close", () => {
            eventBus.off("DEBUG_EVENT", onDebugEvent);
        });
    });

    return router;
}

module.exports = buildDebugRoutes;
