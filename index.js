const { withUiHook, htm } = require('@zeit/integration-utils')
const axios = require('axios');

axios.defaults.baseURL = 'https://api.zeit.co/';

module.exports = withUiHook(async({ payload }) => {
  const user = {
    team_id: payload.team.id
  };
  return start({user, payload});
})

async function start(props) {
  return renderListPage(props);
}

let user_input = {
  new_secret_name: '',
  new_secret_value: '',
  new_env_key: '',
  new_env_value: ''
};
async function renderListPage({user: {team_id}, payload}){
  const { token, clientState, projectId } = payload;
  axios.defaults.headers.common = {'Authorization': `Bearer ${token}`};

  if(payload.action.includes('add_secret###new_secret')){
    const {new_secret_name, new_secret_value} = clientState;
    if(new_secret_name&&new_secret_value){
      const url = `v2/now/secrets?teamId=${team_id}`;
      const createSecret = await axios.post(url, 
        {name:new_secret_name, value:new_secret_value}
      );
    }
  }

  if(payload.action.includes('delete_secret###')){
    const target = payload.action.split('###')[1];
    const url = `v2/now/secrets/${target}?teamId=${team_id}`;
    const deleteSecret = await axios.delete(url);
    // console.log(deleteSecret)
  }
  if(payload.action.includes('delete_env###')){
    const target = payload.action.split('###')[1];
    const url = `v1/projects/${projectId}/env/${encodeURIComponent(target)}`;
    const deleteEnv = await axios.delete(url);
  }
  if(payload.action.includes('add_env###new_env')){
    let {new_env_key, new_env_value} = clientState;
    new_env_key = new_env_key.replace(/\s/g, '');
    if(new_env_key&&new_env_value){
      const url = `v1/projects/${projectId}/env?teamId=${team_id}`;
      const createEnv = await axios.post(url, 
        {key:new_env_key, value:`@${new_env_value}`}
      );
      // console.log(createEnv);
    }
  }
  const secretsList = await axios.get(`v2/now/secrets?teamId=${team_id}`);
  return htm`
  <Page>
    <Box display="flex" flexDirection="row" justifyContent="Space-between" textAlign="left" fontSize="1.2rem" margin="20px">
      <Box width="30%"><H1>Secrets</H1></Box>
    </Box>
    <Notice type="message">Secrets are bound to account/team.</Notice>
    <Fieldset>
      <Box display="flex" flexDirection="row" justifyContent="Space-between" textAlign="left" fontSize="1.2rem" margin="20px">
        <Box width="33%">
          <Input margin="-5px" label="secret name" width="100%" name="new_secret_name" value="${user_input.new_secret_name}" />
        </Box>
        <Box width="2%" />
        <Box width="55%">
          <Input margin="-5px" label="secret value" width="100%" name="new_secret_value" value="${user_input.new_secret_value}" />
        </Box>
        <Box width="5%" />
        <Box width="10%" opacity="80%" paddingTop="30px">
          <Button small action=${`add_secret###new_secret`}>ADD</Button>
        </Box>
      </Box>
    </Fieldset>
      ${secretsList.data.secrets.reverse().map(s=>{
        return htm`
        <Fieldset>
          <Box display="flex" flexDirection="row" justifyContent="Space-between" textAlign="left" fontSize="1.2rem" margin="20px">
            <Box width="33%" paddingTop="5px">${s.name}</Box>
            <Box width="2%" />
            <Box width="55%"><Input width="100%" disabled name="${s.name}" value="*********************" /></Box>
            <Box width="5%" />
            <Box width="10%" opacity="80%" paddingTop="6px">
              <Button small warning action=${`delete_secret###${s.name}`}>DELETE</Button>
            </Box>
          </Box>
        </Fieldset>
        `
      })}
    <Box height="30px"/>
    <Box display="flex" flexDirection="row" justifyContent="Space-between" textAlign="left" fontSize="1.2rem" margin="20px">
      <Box width="30%"><H1>Environment variables</H1></Box>
      <Box width="70%" textAlign="right"><ProjectSwitcher /></Box>
    </Box>
    ${renderInfoEnv(projectId)}
    ${await renderEnv(projectId, secretsList)}
    <Box height="80px"></Box>
  </Page>
  `
}

function renderInfoEnv(projectId) {
if(!projectId){
  return htm`
    <Notice type="warn">Environment variables are project speicific. <B>Select a project to show variables.</B></Notice>
  `
}else{
  return htm`<Box>No variables.</Box>`
}
}

async function renderEnv(projectId, secretsList) {
  if(!projectId) return htm`<Box></Box>`;
  console.log(projectId);
  const envsList = await axios.get(`v1/projects/${projectId}/env`);
  return htm`<Notice>NOTE: For security, only secrets can be used for these environment variables.</Notice>
  <Fieldset>
    <Box display="flex" flexDirection="row" justifyContent="Space-between" textAlign="left" fontSize="1.2rem" margin="20px">
      <Box width="33%">
        <Input type='text' label="variable key" width="100%" name="new_env_key" value="${user_input.new_env_key}" />
      </Box>
      <Box width="2%" />
      <Box width="55%">
        <Select label="variable value" width="100%" name="new_env_value" value="${user_input.new_env_value}">
        <Option value="none" caption='choose from secret' />
        ${secretsList.data.secrets.reverse().map((s, i)=>{
          return htm`<Option value="${s.name}" caption=${`@${s.name}`} />`
        })}
        </Select>
      </Box>
      <Box width="5%" />
      <Box width="10%" opacity="80%" paddingTop="30px">
        <Button small action=${`add_env###new_env`}>ADD</Button>
      </Box>
    </Box>
  </Fieldset>
  ${envsList.data.reverse().map(e=>{
    return htm`
    <Fieldset>
      <Box display="flex" flexDirection="row" justifyContent="Space-between" textAlign="left" fontSize="1.2rem" margin="20px">
        <Box width="33%" paddingTop="5px">${e.key}</Box>
        <Box width="2%" />
        <Box width="55%" paddingTop="5px">
          ${e.value}
        </Box>
        <Box width="5%" />
        <Box width="10%" opacity="80%" paddingTop="6px">
          <Button small warning action=${`delete_env###${e.key}`}>DELETE</Button>
        </Box>
      </Box>
    </Fieldset>
    `
  })}
  `
}
