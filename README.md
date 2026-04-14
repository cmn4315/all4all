# Quality Gate Results

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=732-Group-4_all4all&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=732-Group-4_all4all)

# Code Coverage Results

[![codecov](https://codecov.io/gh/732-Group-4/all4all/branch/main/graph/badge.svg)](https://app.codecov.io/github/732-Group-4/all4all)

# License

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

# All 4 All

## Project Overview

This application provides a platform where organizations and volunteers can post and browse for events in their local area. This app aims to spread awareness and make the volunteer process easier for everyone. It can be tricky to find volunteer opportunities as each organization has their own communication method, as a volunteer it can be confusing and difficult to track. All4All should provide a one stop shop where organizations and volunteers can come together and spread positivty through community service.

Organizations can create an account, login, logout, edit their profile, create/read/update/delete events, view the number of volunteers registered for an event, and attach badges to particular events.

Volunteers can create an account, login, logout, edit their profile, view events, filter events, search for events, register/unregister for events, and view the badges they have collected.

## Installation Instructions

1. Clone the repository locally
2. Ensure Docker Desktop is installed
3. run `npm install` to download all of the dependencies locally
4. In one termianl, run `docker compose up`. This should spin up the database and prepopulate it. Keep this terminal open. Upon closing the application, if you would like to wipe the database, run `docker compose down -v`. If you would like to simply turn off the database, run `docker compose down`.
5. Open another terminal, run `cd src` and then `npm run dev`. This should start the project and produce a link on `localhost` where the application is being run

## Usage

1. Once the application is running, create an account on either the volunteer or organizations tab
2. Login
3. Make edits to your profile as necessary, including uploading a profile photo
4. If you are an organization, upload a series of badges you would like to attach to your events as rewards for people helping out. Then, create a series of events to spread awareness for your cause
5. If you are a volunteer, check out events and see whats going on in your area, register if possible
6. Logout once done, be sure to check events daily for updates

## Project Structure

- A majority of the source code is located inside of the `\src` folder. This is seperated out into images, frontend, backend, and backend test files.
- The `\backend` folder has a `server.js` file which hosts all of the API endpoints the frontend uses
- The `\frontend` folder has a series of components which are reused throughout the application along with the various styling files over the basic components provided by Vite
- The `\tests` folder, which is located in the project root, has all of the Selenium frontend tests. These exercise the frontend by opening a chrome browser.
- The `\init` folder holds the db schema and startup scripts. When the database is created in the previous steps it will run the files in that folder in order, first dropping the tables, followed by inserting the schema, followed by finally populating the tables with appropriate information
- The `\coverage` folder holds all of the code coverage information for both the backend and frontend tests. In each of the folders is an `index.html` file which can be opened to view a UI of the coverage reports.

## Technologies Used

- Database: PostgreSQL, Docker
- Backend: JavaScript, Node
- Frontend: React, Vite
- CI: Github Actions
