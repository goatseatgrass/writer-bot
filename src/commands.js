/**
 * Share command metadata from a common spot to be used for both runtime
 * and registration.
 */

export const INVITE_COMMAND = {
  name: 'invite',
  description: 'Get an invite link to add the bot to your server',
};

export const UPDATE_COMMAND = {
  name: 'update',
  description: 'Update the word count for your project.',
  options: [
    {
      name: 'projectname',
      type: 3, // STRING
      description: 'The name of your project',
      required: true,
    },
    {
      name: 'wordcount',
      type: 4, // INTEGER
      description: 'The number of words to add',
      required: true,
    },
  ],
};

export const CREATE_COMMAND = {
  name: 'create',
  description: 'Create a new project with an initial word count.',
  options: [
    {
      name: 'projectname',
      type: 3, // STRING
      description: 'The name of your project',
      required: true,
    },
    {
      name: 'initialwordcount',
      type: 4, // INTEGER
      description: 'The initial word count',
      required: true,
    },
  ],
};

export const DELETE_COMMAND = {
  name: 'delete',
  description: 'Delete an existing project.',
  options: [
    {
      name: 'projectname',
      type: 3, // STRING
      description: 'The name of the project to delete',
      required: true,
    },
  ],
};

export const EDIT_COMMAND = {
  name: 'editname',
  description: 'Edit the name of an existing project.',
  options: [
    {
      name: 'oldprojectname',
      type: 3, // STRING
      description: 'The current name of your project',
      required: true,
    },
    {
      name: 'newprojectname',
      type: 3, // STRING
      description: 'The new name for your project',
      required: true,
    },
  ],
};

export const LIST_PROJECTS_COMMAND = {
  name: 'listprojects',
  description: 'List all your projects.'
};

export const ALL_COMMANDS = [
  INVITE_COMMAND,
  UPDATE_COMMAND,
  CREATE_COMMAND,
  DELETE_COMMAND,
  EDIT_COMMAND,
  LIST_PROJECTS_COMMAND,
];