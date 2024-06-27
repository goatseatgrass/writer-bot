import Airtable from 'airtable';

async function updateWordCount(username, projectname, wordcount, token) {
  const base = new Airtable({ apiKey: token }).base('appoelJu0fV5ng47u');   
  const table = base('projecttable');    

  const records = await table.select({
    filterByFormula: `AND({Username} = '${username}', {ProjectName} = '${projectname}')`
  }).all();

  if (records.length > 0) {
    const record = records[0];
    const currentCount = parseInt(record.get('CurrentWordCount'), 10) || 0;
    const newCount = currentCount + wordcount;
    await table.update(record.id, { CurrentWordCount: newCount });
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
    await table.create({ Username: username, ProjectName: projectname, InitialWordCount: initialwordcount, CurrentWordCount: initialwordcount });
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
    wordCount: record.get('CurrentWordCount')
  }));

  return projects;
}

async function getProgressReport(username, token) {
  const base = new Airtable({ apiKey: token }).base('appoelJu0fV5ng47u');
  const table = base('projecttable');

  const records = await table.select({
    filterByFormula: `{Username} = '${username}'`
  }).all();

  const projects = records.map(record => ({
    projectName: record.get('ProjectName'),
    initialWordCount: record.get('InitialWordCount'),
    currentWordCount: record.get('CurrentWordCount'),
    wordsWritten: record.get('CurrentWordCount') - record.get('InitialWordCount')
  }));

  const totalWordsWritten = projects.reduce((sum, project) => sum + project.wordsWritten, 0);

  return { projects, totalWordsWritten };
}

async function updateReviews(username, receivedUsername, token) {
  const base = new Airtable({ apiKey: token }).base('appoelJu0fV5ng47u');
  const table = base('reviewtable');

  const userRecord = await table.select({
    filterByFormula: `{Username} = '${username}'`
  }).all();

  if (userRecord.length > 0) {
    const user = userRecord[0];
    await table.update(user.id, {
      ReviewsGiven: (user.get('ReviewsGiven') || 0) + 1,
    });
  } else {
    await table.create({
      Username: username,
      ReviewsGiven: 1,
      ReviewsReceived: 0,
    });
  }

  const receivedUserRecord = await table.select({
    filterByFormula: `{Username} = '${receivedUsername}'`
  }).all();

  if (receivedUserRecord.length > 0) {
    const receivedUser = receivedUserRecord[0];
    await table.update(receivedUser.id, {
      ReviewsReceived: (receivedUser.get('ReviewsReceived') || 0) + 1,
    });
  } else {
    await table.create({
      Username: receivedUsername,
      ReviewsGiven: 0,
      ReviewsReceived: 1,
    });
  }

  return { success: true };
}

export { updateWordCount, createProject, deleteProject, editProjectName, fetchProjects, getProgressReport, updateReviews };
