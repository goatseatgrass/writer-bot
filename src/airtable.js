import Airtable from 'airtable';

async function updateWordCount(username, projectname, wordcount, token) {
  const base = new Airtable({ apiKey: token }).base('appoelJu0fV5ng47u');   
  const table = base('projecttable');    

  const records = await table.select({
    filterByFormula: `AND({Username} = '${username}', {ProjectName} = '${projectname}')`
  }).all();

  if (records.length > 0) {
    const record = records[0];
    const currentCount = parseInt(record.get('WordCount'), 10) || 0;
    const newCount = currentCount + wordcount;
    await table.update(record.id, { WordCount: newCount });
    console.log(`Word count for ${username}'s project "${projectname}" updated from ${currentCount} to ${newCount}`);
    return { success: true, newCount: newCount };
  } else {
    return false;
  }
}

async function createProject(username, projectname, initialwordcount, token) {
  const base = new Airtable({ apiKey: token }).base('appoelJu0fV5ng47u'); 
  const table = base('projecttable');

  const records = await table.select({
    filterByFormula: `{Username} = '${username}'`
  }).all();

  const projectExists = records.some(record => 
    record.get('ProjectName').toLowerCase() === projectname.toLowerCase()
  );

  if (projectExists) {
    return { success: false, message: `Project "${projectname}" already exists for user "${username}".` };
  } else {
    await table.create({ Username: username, ProjectName: projectname, WordCount: initialwordcount });
    return { success: true, message: `Project "${projectname}" created with an initial word count of ${initialwordcount}.` };
  }
}

async function deleteProject(username, projectname, token) {
  const base = new Airtable({ apiKey: token }).base('appoelJu0fV5ng47u');   
  const table = base('projecttable');    

  const records = await table.select({
    filterByFormula: `AND({Username} = '${username}', {ProjectName} = '${projectname}')`
  }).all();

  if (records.length > 0) {
    const record = records[0];
    await table.destroy(record.id);
    console.log(`Project "${projectname}" deleted for ${username}`);
    return true;
  } else {
    return false;
  }
}

async function editProjectName(username, oldprojectname, newprojectname, token) {
  const base = new Airtable({ apiKey: token }).base('appoelJu0fV5ng47u');   
  const table = base('projecttable');    

  const records = await table.select({
    filterByFormula: `AND({Username} = '${username}', {ProjectName} = '${oldprojectname}')`
  }).all();

  if (records.length > 0) {
    const record = records[0];
    await table.update(record.id, { ProjectName: newprojectname });
    console.log(`Project name for ${username} changed from "${oldprojectname}" to "${newprojectname}"`);
    return true;
  } else {
    return false;
  }
}

async function fetchProjects(username, token) {
  const base = new Airtable({ apiKey: token }).base('appoelJu0fV5ng47u'); 
  const table = base('projecttable'); 

  const records = await table.select({
    filterByFormula: `{Username} = '${username}'`
  }).all();

  const projects = records.map(record => ({
    projectName: record.get('ProjectName'),
    wordCount: record.get('WordCount')
  }));

  return projects;
}

export { updateWordCount, createProject, deleteProject, editProjectName, fetchProjects };
