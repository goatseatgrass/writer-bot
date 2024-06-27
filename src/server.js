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
  PROGRESS_REPORT_COMMAND,
  REVIEW_COMMAND,
} from './commands.js';
import { updateWordCount, createProject, deleteProject, editProjectName, fetchProjects, getProgressReport, updateReviews } from './airtable.js';
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

function createEmbed(title, description, color) {
  const embed = {
    title: title,
    description: description,
    color: color,
  };
  embed.thumbnail = { url: "https://raw.githubusercontent.com/goatseatgrass/writer-bot/main/resources/RW_RE-BIRTH_1.png" };


  return {
    embeds: [embed],
  };
}

async function getUsernameById(userId, token) {
  const url = `https://discord.com/api/v10/users/${userId}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bot ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.ok) {
    const userData = await response.json();
    return userData.username;
  } else {
    console.error(`Failed to fetch username: ${await response.text()}`);
    return null;
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
    const guildId = interaction.guild_id; 
    const discordToken = env.DISCORD_TOKEN; 
    const newRoleId = '1255806595804303421';

    
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
//          if (result.newCount > 10000) {
//            await assignRoleToUser(guildId, userId, newRoleId, discordToken);
//          }
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: createEmbed("Project Updated", `Word count for project "${projectname}" updated successfully. The current word count is ${result.newCount}.`, 0xFF0000),  
          });
        } else {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: createEmbed("Project Update Failed", `Failed to update word count for project "${projectname}". Project not found.`, 0xFF0000),  
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
            data: createEmbed("Project Created", result.message, 0xFF0000),  
          });
        } else {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: createEmbed("Creation Failed", result.message, 0xFF0000),  
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
            data: createEmbed("Project Deleted", `Project "${projectname}" deleted successfully.`, 0xFF0000),  
           });
        } else {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: createEmbed("Project Deletion Failed", `Failed to delete project "${projectname}". Project not found.`, 0xFF0000),  
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
            data: createEmbed("Project Edited", `Project name changed from "${oldprojectname}" to "${newprojectname}".`, 0xFF0000),  
          });
        } else {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: createEmbed("Project Edit Failed", `Failed to change project name. Project "${oldprojectname}" not found.`, 0xFF0000),  
           });
        }
      }
      case LIST_PROJECTS_COMMAND.name.toLowerCase(): {
        const projects = await fetchProjects(username, token);

        if (projects.length > 0) {
          const projectList = projects.map(project => `**${project.projectName}**: ${project.wordCount} words`).join('\n');
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: createEmbed("Your Projects", projectList, 0xFF0000),  
          });
        } else {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: createEmbed("No Projects Found", "You have no projects.", 0xFF0000),  
          });
        }
      }
      case PROGRESS_REPORT_COMMAND.name.toLowerCase(): {
        const report = await getProgressReport(username, token);

        if (report.projects.length > 0) {
          const reportList = report.projects.map(project => `**${project.projectName}**: ${project.wordsWritten} words written`).join('\n');
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: createEmbed("Your Progress Report", `${reportList}\n\n**Total Words Written**: ${report.totalWordsWritten}`, 0xFF0000),  
          });
        } else {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: createEmbed("No Projects Found", "You have no projects.", 0xFF0000),  
          });
        }
      }
      case REVIEW_COMMAND.name.toLowerCase(): {
        let receivedUserId;
        for (const option of interaction.data.options) {
          if (option.name === 'receivedusername') receivedUserId = option.value;
        }

        const receivedUsername = await getUsernameById(receivedUserId, env.DISCORD_TOKEN);
        if (!receivedUsername) {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: createEmbed("Review Failed", `Failed to retrieve the username for ID ${receivedUserId}.`, 0xFF0000), // Red color
          });
        }

        const result = await updateReviews(username, receivedUsername, token);

        if (result.success) {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: createEmbed("Review Given", `You have successfully given a review to ${receivedUsername}.`, 0xFF0000),  
          });
        } else {
          return new JsonResponse({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: createEmbed("Review Failed", `Failed to give a review to ${receivedUsername}.`, 0xFF0000), // Red color
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
