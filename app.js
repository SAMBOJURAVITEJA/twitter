let sqlite3 = require("sqlite3");
let { open } = require("sqlite");
let path = require("path");
let DBpath = path.join(__dirname, "twitterClone.db");
let express = require("express");
let app = express();
app.use(express.json());
let DB = null;
module.exports = app;
let bcrypt = require("bcrypt");
let token = require("jsonwebtoken");
let intializing = async () => {
  try {
    DB = await open({
      filename: DBpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server is running properly");
    });
  } catch (error) {
    process.exit(1);
    response.send(error);
  }
};
intializing();

let logger = (request, response, next) => {
  let Token;
  let header = request.headers["authorization"];
  if (header !== undefined) {
    Token = header.split(" ")[1];
  }
  if (Token === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    token.verify(Token, "my_secret", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};
let passwordVerification = (password) => {
  return password.length >= 6;
};

app.post("/register/", async (request, response) => {
  let { username, password, name, gender } = request.body;
  console.log(username);
  let verify = `select * from user where username = "${username}";`;
  let result = await DB.get(verify);
  console.log(result);
  if (result === undefined) {
    if (passwordVerification(password)) {
      let hashedPassword = await bcrypt.hash(password, 2);
      console.log(hashedPassword);
      let query = `insert into user 
           (username,password,name,gender)
           values
           ("${username}","${hashedPassword}",
           "${name}",
           "${gender}");`;
      let finalResult = await DB.run(query);

      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});
app.post("/login/", async (request, response) => {
  let { username, password } = request.body;
  let query = `select * from user where username="${username}";`;
  let result = await DB.get(query);
  if (result !== undefined) {
    let verification = await bcrypt.compare(password, result.password);
    if (verification) {
      let payload = { username: username };
      let jwtToken = token.sign(payload, "my_secret");
      console.log(jwtToken);
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});
app.get("/user/tweets/feed/", logger, async (request, response) => {
  let query = `select distinct(username),tweet,date_time from (user join follower 
    on user.user_id=follower.following_user_id) as t 
    join tweet  on following_user_id=tweet.user_id 
    order by date_time desc 
    limit 4;`;
  let result = await DB.all(query);
  var array = [];
  let organized = (value1) => {
    let pad = {
      username: value1.username,
      tweet: value1.tweet,
      dateTime: value1.date_time,
    };
    array.push(pad);
    return array;
  };

  for (let key of result) {
    let mad = organized(key);
  }

  response.send(array);
});
app.get("/user/following/", logger, async (request, response) => {
  let query = `select name from user join 
  follower on user.user_id=follower
    .following_user_id ;`;
  let data = await DB.all(query);
  response.send(data);
});
