# Cribl Cloud Diag Upload Service

## To Start

- Clone this repo.
- With globally installed `npm` or accessed via `npx`
  - From the root of your cloned repo:
    - `cd` into `packages/diag-upload-api`.
    - Run `npm install` to install the dependencies.
    - Then, run `npm start` to start the API.
  - From the root of your cloned repo:
    - `cd` into `packages/diag-upload-ui`.
    - Run `npm install` to install the dependencies.
    - Then, run `npm start` to start the React app.

## API

Create a RESTful API with the following endpoints:

- [ ] Upload a file
- [ ] Get all files
- [ ] Download a file
- [ ] Delete a file
- [ ] Update a file

## UI

- [ ] Integrate your API with the provided UI under `/packages/diag-upload-ui`. The expectation is that you'll only need to make minimal changes to the UI code to connect it to your developed API. Most of your work should be in the `/src/utils.ts` file.
