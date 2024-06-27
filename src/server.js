/**
 * The core server that runs on a Cloudflare worker.
 */

import { AutoRouter } from 'itty-router';
import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from 'discord-interactions';
import {
  INVITE_COMMAND,
  UPDATE_COMMAND,
  CREATE_COMMAND,
  DELETE_COMMAND,
  EDIT_COMMAND,
  LIST_PROJECTS_COMMAND,
} from './commands.js';
import { updateWordCount, createProject, deleteProject, editProjectName, fetchProjects } from './airtable.js';
import { InteractionResponseFlags } from 'discord-interactions';

class JsonResponse extends Response {
  constructor(body, init) {
    const jsonBody = JSON.stringify(body);
    init = init || {
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
    };
    super(jsonBody, init);
  }
}

const router = AutoRouter();

async function assignRoleToUser(guildId, userId, roleId, token) {
  const url = `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`Failed to assign role: ${await response.text()}`);
  }
}

/**
 * A simple :wave: hello page to verify the worker is working.
 */
router.get('/', (request, env) => {
  return new Response(`👋 ${env.DISCORD_APPLICATION_ID}`);
});

/**
 * Main route for all requests sent from Discord.  All incoming messages will
 * include a JSON payload described here:
 * https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object
 */
router.post('/', async (request, env) => {
  const { isValid, interaction } = await server.verifyDiscordRequest(
    request,
    env,
  );
  if (!isValid || !interaction) {
    return new Response('Bad request signature.', { status: 401 });
  }

  if (interaction.type === InteractionType.PING) {
    // The `PING` message is used during the initial webhook handshake, and is
    // required to configure the webhook in the developer portal.
    return new JsonResponse({
      type: InteractionResponseType.PONG,
    });
  }

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    // Most user commands will come as `APPLICATION_COMMAND`.
    const username = interaction.member.user.username;
    const token = env.AIRTABLE_PERSONAL_ACCESS_TOKEN; 
    const userId = interaction.member.user.id;
    const guildId = interaction.guild_id; // Get the guild ID from the interaction
    const discordToken = env.DISCORD_TOKEN; // The bot token to manage roles
    const newRoleId = '1255806595804303421'; // Replace with the ID of the role to assign

    
    switch (interaction.data.name.toLowerCase()) {
      case INVITE_COMMAND.name.toLowerCase(): {
        const applicationId = env.DISCORD_APPLICATION_ID;
        const INVITE_URL = `https://discord.com/oauth2/authorize?client_id=${applicationId}&scope=applications.commands`;
        return new JsonResponse({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: INVITE_URL,
            flags: InteractionResponseFlags.EPHEMERAL,
          },
        });
      }
      case UPDATE_COMMAND.name.toLowerCase(): {
        let projectname, wordcount;
        for (const option of interaction.data.options) {
          if (option.name === 'projectname') projectname = option.value;
          if (option.name === 'wordcount') wordcount = option.value;
        }
        const result = await updateWordCount(username, projectname, wordcount, token);
        if (result.success) {
          if (result.newCount > 10000) {
            await assignRoleToUser(guildId, userId, newRoleId, discordToken);
          }
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Word count for project "${projectname}" updated successfully. The current word count is ${result.newCount}.`,
           },
          });
        } else {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Failed to update word count for project "${projectname}". Project not found.`,
            },
          });
        }
      }
      case CREATE_COMMAND.name.toLowerCase(): {
        let projectname, initialwordcount;
        for (const option of interaction.data.options) {
          if (option.name === 'projectname') projectname = option.value;
          if (option.name === 'initialwordcount') initialwordcount = option.value;
        }
        const result = await createProject(username, projectname, initialwordcount, token);
        if (result.success) {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              embeds: [{
                title: "Project Created",
                description: result.message,
                color: 0x00FF00, // Green color
                image: {
                  url: "https://github.com/goatseatgrass/writer-bot/blob/main/resources/RW_RE-BIRTH_1.webp" // URL of the image to display
                },
                thumbnail: {
                  url: "https://github.com/goatseatgrass/writer-bot/blob/main/resources/RW_RE-BIRTH_1.webp" // URL of the thumbnail image
                },
                footer: {
                  text: "Created by Your Bot"
                },
                timestamp: new Date()
              }],
            },
          });
        } else {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              embeds: [{
                title: "Creation Failed",
                description: result.message,
                color: 0xFF0000, // Red color
              }],
            },
          });
        }
      }
      case DELETE_COMMAND.name.toLowerCase(): {
        let projectname;
        for (const option of interaction.data.options) {
          if (option.name === 'projectname') projectname = option.value;
        }
        const success = await deleteProject(username, projectname, token);
        if (success) {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Project "${projectname}" deleted successfully.`,
            },
          });
        } else {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Failed to delete project "${projectname}". Project not found.`,
            },
          });
        }
      }
      case EDIT_COMMAND.name.toLowerCase(): {
        let oldprojectname, newprojectname;
        for (const option of interaction.data.options) {
          if (option.name === 'oldprojectname') oldprojectname = option.value;
          if (option.name === 'newprojectname') newprojectname = option.value;
        }
        const success = await editProjectName(username, oldprojectname, newprojectname, token);
        if (success) {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Project name changed from "${oldprojectname}" to "${newprojectname}".`,
            },
          });
        } else {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Failed to change project name. Project "${oldprojectname}" not found.`,
            },
          });
        }
      }
      case LIST_PROJECTS_COMMAND.name.toLowerCase(): {
        const projects = await fetchProjects(username, token);

        if (projects.length > 0) {
          const projectList = projects.map(project => `**${project.projectName}**: ${project.wordCount} words`).join('\n');
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              embeds: [{
                title: "Your Projects",
                description: projectList,
                color: 0x00FF00, // Green color
              }],
            },
          });
        } else {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              embeds: [{
                title: "No Projects Found",
                description: "You have no projects.",
                color: 0xFF0000, // Red color
              }],
            },
          });
        }
      }
      default:
        return new JsonResponse({ error: 'Unknown Type' }, { status: 400 });
    }
  }

  console.error('Unknown Type');
  return new JsonResponse({ error: 'Unknown Type' }, { status: 400 });
});
router.all('*', () => new Response('Not Found.', { status: 404 }));

async function verifyDiscordRequest(request, env) {
  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const body = await request.text();
  const isValidRequest =
    signature &&
    timestamp && 
    (await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY));
  if (!isValidRequest) {
    return { isValid: false };
  }

  return { interaction: JSON.parse(body), isValid: true };
}

const server = {
  verifyDiscordRequest,
  fetch: router.fetch,
};

export default server;
