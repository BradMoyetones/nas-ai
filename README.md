# NAS API

## Overview

A simple API for try out new API development skills

## Setup & Installation

```bash
pnpm i
pnpm dev
```

## Useful PM2 commands

| Command                 | Description                                                                              |
| :---------------------- | :--------------------------------------------------------------------------------------- |
| `pm2 stop nas-api-proccess`       | Stops the application temporarily (remains in the list).                                 |
| `pm2 start nas-api-proccess`      | Turns the application back on if it was stopped.                                         |
| `pm2 restart nas-api-proccess`    | Restarts the application. **(Always use it after `git pull`).**                          |
| `pm2 list` (o `pm2 ls`) | Shows the table with all running apps, their status and memory consumption.              |
| `pm2 logs nas-api-proccess`       | Prints `console.log` and errors in real time. (Press `Ctrl + C` to exit).                |
| `pm2 delete nas-api-proccess`     | Stops and completely removes the application from the PM2 registry.                      |
| `pm2 show nas-api-proccess`       | Shows detailed information about the application (routes, metrics, variables).           |
| `pm2 monit`             | Opens an interactive panel in the terminal to view CPU and RAM consumption in real time. |
