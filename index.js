const { withUiHook, htm } = require('@zeit/integration-utils')
const UserModel = require('./model');
const mongoose = require('mongoose');
const axios = require('axios');

mongoose.connection.once('open', () => console.log("Mongoose connection opened on process " + process.pid));
mongoose.Promise = global.Promise;

module.exports = withUiHook(async({ payload }) => {
  // console.log(payload);
  const user_id = payload.user.id;
  let team_id;
  if(payload.team && payload.team.id) {
    team_id = payload.team.id;
  }
  await conntectMongo();
  const user = await UserModel.findOne({user_id});
  if(!user){
    const user = new UserModel({user_id, team_id});
    const savedUser = await user.save();
    return start({user: savedUser, payload});
  }else{
    // console.log(user);
    return start({user, payload});
  }
})

async function start({user, payload}) {
  let secretsList = [];
  const { token } = payload;
  axios.defaults.baseURL = 'https://api.zeit.co/';
  axios.defaults.headers.common = {'Authorization': `Bearer ${token}`};
  if(payload.projectId){
    const secrets = await axios.get(`v2/now/secrets?teamId=${user.team_id}`);
    console.log(secrets.data.secrets);
    return htm`
    <Page>
      <Fieldset>
        <FsContent>
          <H1>Choose your project:</H1>
          <ProjectSwitcher />
        </FsContent>
      </Fieldset>
        ${secrets.data.secrets.map((s, i)=>{
          return htm`
          <Fieldset>
            <FsContent>
              <Box>
                ${s.name}
              </Box>
              <Box>
                <Input name="${s.name}" value="************" />
              </Box>
              <Box>
                <Button>Delete</Button>
              </Box>
            </FsContent>
            </Fieldset>
          `
        })}
    </Page>
    `
  }
  return htm`
  <Page>
    <Fieldset>
      <FsContent>
        <H1>Choose your project:</H1>
        <ProjectSwitcher />
      </FsContent>
      <FsContent>
      </FsContent>
    </Fieldset>
  </Page>
  `
}


function conntectMongo() {
  return new Promise( (res, rej)=>mongoose.connect('mongodb://localhost/zeit-sudo-ui-hook', (err)=>{
    if(err){
      rej(err);
    }else{
      res();
    };
  }));
}
