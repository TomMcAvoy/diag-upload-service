# Cribl Cloud Diag Upload Service

## How to use this repository

### Clone this repository

```shell
git clone https://github.com/hafbau/diag-upload-service
cd diag-upload-service
```

Ensure that You have globally installed `npm` or accessed via `npx`.

### API server

Install all the dependencies and start the API server.

```shell
cd diag-upload-api
npm install
npm start
```

### React app

Install all the dependencies and start the React app.

```shell
cd diag-upload-ui
npm install
npm start
```

## API

Create a RESTful API with the following endpoints:

- [ ] Upload a file
- [ ] Get all files
- [ ] Download a file
- [ ] Delete a file
- [ ] Update a file

## UI

- [ ] Integrate your API with the provided UI under `/diag-upload-ui`. The expectation is that you'll only need to make minimal changes to the UI code to connect it to your developed API. Most of your work should be in the `/src/utils.ts` file.
