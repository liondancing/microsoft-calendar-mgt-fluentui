## Steps to Export Web Component to Freemium App

### 1. Required Files

First you need to create 2 files

- compressed js
- compressed css

For React based apps, just run `npm run build`. This will generate a `build` folder containing a *main.something.css* file and a *main.something.js* file under `build/static/css|js`.

### 2. Testing It Out

Now we'll see if our compiled React app works as a regular web component or not. We can do it by serving the `build` folder, using a simple http server. For example,

```
python -m http.server 3000 -d ./build
```

Note that it is important to use port 3000 here, since it is hard coded in the reusable `wp-webcomponent` library. If you use some other port you'll get a `Cannot read properties of undefined (reading 'server')` error.

### 3. New Entry in `webcomponent` Collection

For this step, you need a tool to explore the MongoDB collections. Install MongoDB Compass or a similar tool of your choice.

Next, from the `.env` in `freemium/backend`, copy the `DATABASE_URL` value (a mongodb connection URL). Open a connection to this URL in MongoDB Compass, and you should be able to see all the collections.

The one we are interested in right now is the `webcomponents` collection.

Create a new document in this collection, following the pattern (or simple clone an existing entry):

```
{
  "name": "Display Name of Your Web Component",
  "filePath": "/",
  "component": "",
  "css": "",
  "element": "wp-outlook-calendar",
  "imageKey": "icons/webcomponents/63ef3af86678234620302eb8.png"
}
```

`element` should match what you used when defining your web component `customElements.define('wp-outlook-calendar', context.instance);`, so in my case it is `wp-outlook-calendar`.

> Update: Below not needed anymore

~~Escape all \ and " characters from your compiled CSS and JS code from previous step. You can do this by making a copy of the files and pressing Cmd + Option + F in VSCode (or check keys for Replace if in Windows/Linux). Replace `\` with `\\`, and `"` with `\"`.~~

~~Paste your JS code from the previous step in `component` field, and CSS in the `css` field.~~

~~After inserting the new document, you might get an error like `Error=16, Details='Response status code does not indicate success: RequestEntityTooLarge (413);`. Need to figure this out.~~

### 4. Adding to Plan/Subscription

Find your user ID (of the account you are testing with). I did by putting a console.log in `frontend/src/views/WebComponent.js:19` in the useEffect. Next, using your user ID, find your subscription from the `subscriptions` collection in MongoDB.

Copy the resource ID from there, then search for it in the `resources` collection (eg. using a filter like `{_id: ObjectId('<ID-HERE>')}`). You will need to add a reference to your new webcomponent here.

Copy the ObjectId (_id) of the new webcomponent entry you added in the `webcomponents` collection, and put it in the `resources.webcomponent` array.

Now, it should be visible in the web components list on Freemium site. Almost there!

### 5. Uploading Build Files

upload build files to DO, keep the file name is same as _id of the component and use webcomponent folder

In the 3rd step, we did not add our compiled JS and CSS to `component` and `css` fields, because they could be too large and MongoDB won't let us insert the new document. That is why, inside `backend/src/routes/webComponents/index.ts` in  the GET handler for `/user/:id` we exclude `css` and `component` fields.

So now we have to upload our compiled code to AWS S3 bucket called `wpicontainer` and fetch from there. You can check the relevant code in backend repo `routes/webComponents/index.ts` in the GET handler for `:webComponentId/:type`.

#### Workaround If No Access to S3
If you don't have access to the S3 bucket, you can use a simple workaround.

Create a `temp` directory in the backend repo, inside `src` directory. Create two directories inside it, `component` and `css`. Copy your newly created (in MongoDB, refer to step 3) webcomponent document's ObjectId, and create `<WEBCOMPONENT_ID>.js` in `component` directory, and `<WEBCOMPONENT_ID>.css` in `css` directory.

Inside `backend/src/routes/webComponents/index.ts` in GET handler for `/:webComponentId/:type`, use the following code (and comment out the request to S3):

```
...
// const response = await getS3Object({
//   Bucket: Env.SPACES_BUCKET,
//   Key: `${req.params.type}/${webComponent._id.toString()}.${
//     req.params.type === "component" ? "js" : "css"
//   }`,
// });
const filePath = __dirname + `/../../temp/${req.params.type}/${webComponent._id.toString()}`
const ext = req.params.type === "component" ? "js" : "css"
const response = fs.readFileSync(`${filePath}.${ext}`, 'utf8')
...
```

Now if you check in the Freemium site, it should render when you view a paramter setting (or create a new one).

~~6. Put the newly created webcomponent _id to your current plan~~


6. Go to preview -> check if all component definition working + check if proxy working + check if all parameters are working
7. Follow the generate instructions in the setting tab of preview
8. Final test the webcomponent 