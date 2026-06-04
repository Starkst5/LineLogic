import express from "express";
import {
  searchCurrentPlayers,
  getPlayerGames,
  getPlayerGameContext,
  getGamesByDate,
  getPlayersByTeam,
  getPlayerTeammates,
  getGameLogsWithTeammate
} from "../controllers/player.controller.js";

export default function (pool) {
  const router = express.Router();

  router.get("/search", async (req, res) => {
    const search = req.query.search;
    if (!search) return res.status(400).json({ error: "Missing search query" });
    try {
      const data = await searchCurrentPlayers(pool, search);
      res.json(data);
    } catch (err) {
      console.error("DB ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Games routes must come before /:playerId
  router.get("/games/schedule", async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "Missing date" });
    try {
      const data = await getGamesByDate(pool, date);
      res.json(data);
    } catch (err) {
      console.error("DB ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/games/team/:teamId/players", async (req, res) => {
    const { teamId } = req.params;
    try {
      const data = await getPlayersByTeam(pool, teamId);
      res.json(data);
    } catch (err) {
      console.error("DB ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/:playerId/context", async (req, res) => {
    const { playerId } = req.params;
    try {
      const context = await getPlayerGameContext(pool, playerId);
      res.json(context);
    } catch (err) {
      console.error("DB ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/:playerId", async (req, res) => {
    const { playerId } = req.params;
    try {
      const data = await getPlayerGames(pool, playerId);
      res.json(data);
    } catch (err) {
      console.error("DB ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/:playerId/teammates", async (req, res) => {
    const { playerId } = req.params;
    try {
      const data = await getPlayerTeammates(pool, playerId);
      res.json(data);
    } catch (err) {
      console.error("DB ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/:playerId/teammate-games/:teammateId", async (req, res) => {
    const { playerId, teammateId } = req.params;
    try {
      const data = await getGameLogsWithTeammate(pool, playerId, teammateId);
      res.json(data);
    } catch (err) {
      console.error("DB ERROR:", err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}