const fs = require("fs");
const path = require("path");
require("colors");
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
    MessageEmbed,
} = require("discord.js");
const wait = require("node:timers/promises").setTimeout;
const { AutoCatcher } = require("./autocatcher/index");
const { startt, stopp, market, checkStatus } = require("./autocatcher/market");
const config = require("./config");
const { log } = require("./utils/utils");
const {
  stop,
  start,
  addToken,
  statMsg,
  autocatchers,
  tokens,
} = require("./functions/functions");
const { transfer } = require("./functions/markett");
const { compileFunction } = require("vm");

const poketwo = "716390085896962058";
let owners = config.owners;
let prefix = config.prefix;
let mainIDInstance = null;
const p2Filter = (p2Msg) => p2Msg.author.id === poketwo;

const bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

bot.on("ready", () => {
  log(`Connected as ${bot.user.tag}`.cyan);
});

bot.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId.startsWith("previous") || interaction.customId.startsWith("next")) {
    await handleTokenPageNavigation(interaction);
  } else if (interaction.customId.startsWith("statPage")) {
    await handlePageNavigation(interaction);
  }
});


function generateTokenEmbed(currentPage, autocatchers) {
  const start = currentPage * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const tokensToShow = autocatchers.slice(start, end);

  const embed = new EmbedBuilder()
    .setTitle(`Token List - Page ${currentPage + 1}`)
    .setColor("#90EE90")
    .setTimestamp();

  if (tokensToShow.length === 0) {
    embed.setDescription("No tokens available.");
  } else {
    tokensToShow.forEach((ac, index) => {
      const user = ac.client.user;
      const username = user ? user.tag : "Unknown User"; // Ensure username is fetched correctly
      embed.addFields({
        name: `Token ${start + index + 1}`,
        value: `**Username**: **${username}**\n**Token**: \`\`\`${ac.token || "No token provided"}\`\`\``, // Ensure token is handled correctly
        inline: false,
      });
    });
  }

  return embed;
}
function generatePaginationButtons(currentPage, autocatchers) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`previous_${currentPage}`)
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId(`next_${currentPage}`)
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
          .setDisabled((currentPage + 1) * PAGE_SIZE >= autocatchers.length)
      )
  ];
}

async function handleTokenPageNavigation(interaction) {
  const args = interaction.customId.split("_");
  let currentPage = parseInt(args[1]);

  if (interaction.customId.startsWith("previous")) {
    if (currentPage > 0) currentPage--;
  } else if (interaction.customId.startsWith("next")) {
    if ((currentPage + 1) * PAGE_SIZE < autocatchers.length) currentPage++;
  } else {
    return;
  }

  // Generate the updated embed
  const embed = generateTokenEmbed(currentPage, autocatchers);
  
  // Update the existing message with the new embed and buttons
  await interaction.update({
    embeds: [embed],
    components: generatePaginationButtons(currentPage, autocatchers),
  });

  // Clear buttons after 1 minute
  setTimeout(async () => {
    try {
      const fetchedMessage = await interaction.message.fetch();
      await fetchedMessage.edit({ components: [] }); // Clear buttons
    } catch (error) {
      console.error("Error clearing buttons:", error);
    }
  }, 60000);
}

async function handlePageNavigation(interaction) {
  const args = interaction.customId.split("-");
  const currentPage = parseInt(args[2]);
  const direction = args[1] === "L" ? -1 : 1;
  const newPage = currentPage + direction;
  await statMsg(interaction, newPage);
}

bot.login(config.botToken);

bot.on("messageCreate", async (message) => {
  if (!message.content.startsWith(prefix)) return;

  if (!owners.includes(message.author.id)) {
    await message.reply("You are not authorised to use this command!");
    return;
  }

  let [command, ...args] = message.content
    .slice(prefix.length)
    .trim()
    .split(/\s+/);
  command = command.toLowerCase();
  args = args.map((x) => x.toLowerCase());

  if (command === "ping") {
    const startTime = Date.now();
    const m = await message.reply("Pinging...");
    const ping = Date.now() - startTime;
    await m.edit(`Pinged with **${ping}ms!**`);
  } else if (command === "stats") {
    await statMsg(message, 0);
  } else if (command === "reload") {
   const MAX_FIELD_LENGTH = 1024;
const MAX_FIELDS_PER_EMBED = 25; // Discord allows up to 25 fields per embed

function chunkText(text, maxLength) {
  const chunks = [];
  let currentChunk = '';

  text.split('\n').forEach(line => {
    const newChunk = currentChunk + line + '\n';
    if (newChunk.length > maxLength) {
      chunks.push(currentChunk);
      currentChunk = line + '\n';
    } else {
      currentChunk = newChunk;
    }
  });

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function createEmbeds(fields) {
  const embeds = [];
  for (let i = 0; i < fields.length; i += MAX_FIELDS_PER_EMBED) {
    const embed = new EmbedBuilder()
      .setTitle("Currently Connected")
      .setColor("#1E90FF")
      .setTimestamp();

    fields.slice(i, i + MAX_FIELDS_PER_EMBED).forEach((field, index) => {
      embed.addFields({
        name: `Field ${i + index + 1}`,
        value: field,
      });
    });

    embeds.push(embed);
  }

  return embeds;
}

try {
  await stop();
  const logs = await start();

  if (!logs || logs.length === 0) {
    await message.channel.send("***Successfully reloaded 0 tokens...***");
  } else {
    await message.channel.send(
      `***Successfully reloaded ${logs.length} tokens...***`
    );

    const formattedLogs = logs
      .map((log, index) => `${index + 1}. 🔹 ${log}`)
      .join('\n');

    const logChunks = chunkText(formattedLogs, MAX_FIELD_LENGTH);
    const embeds = createEmbeds(logChunks);

    embeds.forEach(embed => {
      message.channel.send({ embeds: [embed] });
    });
  }
} catch (error) {
  console.error("Error during reload:", error);
  await message.channel.send("❌ Failed to reload. Please check the logs.");
}
  } else if (command === "add-token") {
    const token = message.content.split(" ")[1];
    if (!token) {
      await message.reply("***Please provide a token to add.***");
      return;
    }

    let replyMessage = await message.reply(`*Attempting to add token...*`);

    addToken(token, (res, success) => {
      replyMessage.edit(
        `${success ? `✅ Added token!` : `❌ Unable to add token!`}\n` +
          "```ansi\n" +
          res +
          "```"
      );
    });
  } else if (command == `captcha`) {
    let id = args[0];
    if (!id) {
      await message.reply(
        `Please give me an ID or mention if its global!\n\`${prefix}captcha <id/on/off>\``
      );
      return;
    }

    id = id.toLowerCase();
    if (args[0] == `on` || args[0] == `off`) {
      let start = args[0] == `on`;
      for (let i = 0; i < autocatchers.length; i++)
        autocatchers[i].captcha = start;
      await message.reply(
        `Successfully toggled **${
          start ? `on` : `off`
        }** in captcha status globally!`
      );
      return;
    }
    id = parseInt(id);
    if (isNaN(id)) return message.reply(`Please give me a valid ID!`);
    let ac = autocatchers.find((x) => x.client.user.id == id);
    if (!ac) return message.reply(`Unable to locate that Asta!`);
    if (args[1]) {
      if (args[1].toLowerCase() == `on`) ac.captcha = false;
      if (args[1].toLowerCase() == `off`) ac.captcha = true;
    }
    message.reply(
      `Captcha has been **toggled __${ac.captcha ? `OFF` : `ON`}__** for ${
        ac.client.user.globalName || ac.client.user.displayName || `User`
      }\n- Captcha URL: 🔗 [Link](https://verify.poketwo.net/captcha/${
        ac.client.user.id
      })`
    );
    ac.captcha = ac.captcha ? false : true;
  } else if (command == `catcher`) {
    let id = args[0];
    if (!id) {
      await message.reply(
        `Please give me an ID or mention if its global!\n\`${config.prefix}catcher <id/on/off>\``
      );
      return;
    }
    id = id.toLowerCase();
    if (args[0] == `start` || args[0] == `stop`) {
      let start = args[0] == `start`;
      for (let i = 0; i < autocatchers.length; i++)
        autocatchers[i].catch = start;
      await message.reply(
        `Successfully **${start ? `started` : `stopped`}** globally!`
      );
      return;
    }
    id = parseInt(id);
    if (isNaN(id)) return message.reply(`Please give me a valid ID!`);
    let ac = autocatchers.find((x) => x.client.user.id == id);
    if (!ac) return message.reply(`Unable to locate that Asta!`);

    if (!args[1])
      return message.reply(
        `Please give provide an option! => \`<start/stop>\``
      );
    args[1] = args[1].toLowerCase();
    if (args[1] == `start` || args[1] == `stop`) {
      let start = args[1] == `start`;
      ac.catch = start;
      await message.reply(
        `Successfully **${start ? `started` : `stopped`}** ${
          ac.client.user.globalName || ac.client.user.displayName || `User`
        }!`
      );
    }
  } else if (command == `ai-catch`) {
    let id = args[0];
    if (!id) {
      await message.reply(
        `Please give me an ID or mention if its global!\n\`${config.prefix}ai-catch <id/on/off>\``
      );
      return;
    }
    id = id.toLowerCase();
    if (args[0] == `start` || args[0] == `stop`) {
      let start = args[0] == `start`;
      for (let i = 0; i < autocatchers.length; i++)
        autocatchers[i].aiCatch = start;
      await message.reply(
        `Successfully **${start ? `started` : `stopped`}** AI globally!`
      );
      return;
    }
    id = parseInt(id);
    if (isNaN(id)) return message.reply(`Please give me a valid ID!`);
    let ac = autocatchers.find((x) => x.client.user.id == id);
    if (!ac) return message.reply(`Unable to locate that Asta!`);

    if (!args[1])
      return message.reply(
        `Please give provide an option! => \`<start/stop>\``
      );
    args[1] = args[1].toLowerCase();
    if (args[1] == `start` || args[1] == `stop`) {
      let start = args[1] == `start`;
      ac.aiCatch = start;
      await message.reply(
        `Successfully **${start ? `started` : `stopped`}** AI catching on${
          ac.client.user.globalName || ac.client.user.displayName || `User`
        }!`
      );
    }
  } else if (command === "set-prefix") {
    const new_prefix = message.content.split(" ")[1];
    if (!new_prefix) {
      return message.reply(`Please provide me a **new prefix** to change.`);
    }
    prefix = new_prefix;
    await message.reply(`Successfully changed prefix to ${new_prefix}`);
  } else if (command === "owner") {
    let id = args[0];
    if (!id) {
      await message.reply(
        `Please provide an ID!\n\`${prefix}owner <id> <add/remove>\``
      );
      return;
    }
    if (isNaN(id)) return message.reply(`Please provide a valid ID!`);

    const isOwner = owners.includes(id);

    if (!args[1]) {
      return message.reply(`Please provide an action! => \`<add/remove>\``);
    }

    if (args[1] === "add") {
      if (isOwner) {
        return message.reply(`ID ${id} is already an owner.`);
      }
      owners.push(id);
      await message.reply(
        `Successfully **added** <@${id}> to **Owners whitelist**`
      );
    } else if (args[1] === "remove") {
      if (!isOwner) {
        return message.reply(`ID ${id} is not in the owners list.`);
      }
      owners = owners.filter((ownerId) => ownerId !== id);
      await message.reply(`Successfully **removed** ID ${id} from owners.`);
    } else {
      await message.reply(
        `Invalid action! Please use \`<add/remove>\` as the second argument.`
      );
    }
  } else if (command === "m-start") {
    const x = message.content.split(" ");
    const token = x[1];
    const channelId = x[2];
    if (!token || !channelId) {
      await message.reply(
        "Please provide both a token and a channel ID with the $start command."
      );
      return;
    }

    await startt(token, channelId, (response) => message.reply(response));
  } else if (command === "m-stop") {
    await stopp((response) => message.reply(response));
  } else if (command === `transfer`) {
    const running = await checkStatus();
    if (!running) {
      return message.reply(`***Please start the client first***`);
    }
    await message.reply(`***Starting to transfer***`);
    await transfer(tokens, (total) => {
      message.reply(`Successfully transferred **${total} pokecoins..**`);
    });
  } else if (command === "current-tokens") {
    const currentPage = 0;
    const embed = generateTokenEmbed(currentPage, autocatchers);
    const components = generatePaginationButtons(currentPage, autocatchers);

    await message.channel.send({
      embeds: [embed],
      components: components,
    });
  } else if (command === "help") {
    const embed = new EmbedBuilder()
      .setTitle("Asta Catcher")
      .setColor("#00BFFF")
      .setThumbnail(bot.user.displayAvatarURL())
      .setDescription(
        "***Here are all available commands***\n\n" +
          "🔹 **ping**    - ```Shows server latency```" +
          "🔹 **help**    - ```Shows this```" +
          "🔹 **reload**  - ```Reloads the autocatcher```" +
          "🔹 **owner**      - ```Adds/Removes/Lists the owner```" +
          "🔹 **add-token**  - ```Adds/Removes a token```" +
          "🔹 **set-prefix** - ```Set new prefix```" +
          "🔹 **ai-catch**    - ```Catch with p2ass/AI```" +
          "🔹 **stats**         - ```View autocatcher stats```" +
          "🔹 **catcher**       - ```Toggle autocatcher on & off```" +
          "🔹 **m-start**   - ```start market client```" +
          "🔹 **m-stop**   -  ```stop market client```" +
          "🔹 **transfer**   - ```transfer coins to market client```" +
           "🔹 **current-tokens**  - ```shows all current tokens```" 
      )
      .setFooter({ text: "Help Embed" })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
});
const PAGE_SIZE = 10;
const BUTTON_TIMEOUT = 60000; // 1 minute

async function tokenListMsg(message, currentPage = 0) {
  const totalPages = Math.ceil(autocatchers.length / PAGE_SIZE);
  const start = currentPage * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const currentTokens = autocatchers.slice(start, end);

  // Generate the token list for the current page
  const tokenList = currentTokens
    .map((ac, index) => `${index + 1 + start}. **${ac.username}**: \`${ac.token}\``)
    .join('\n');

  // Create or update the embed
  const embed = new MessageEmbed()
    .setTitle('Token List')
    .setDescription(tokenList || 'No tokens available.')
    .setFooter(`Page ${currentPage + 1} of ${totalPages}`);

  // Create the buttons for pagination
  const row = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId(`tokenPage-L-${currentPage}-${message.author.id}`)
      .setLabel('◀️')
      .setStyle('PRIMARY')
      .setDisabled(currentPage === 0),
    new MessageButton()
      .setCustomId(`tokenPage-R-${currentPage}-${message.author.id}`)
      .setLabel('▶️')
      .setStyle('PRIMARY')
      .setDisabled(currentPage === totalPages - 1)
  );

  // Update the original message with the new embed and buttons
  await message.edit({ embeds: [embed], components: [row] });

  // Clear the buttons after 1 minute
  setTimeout(async () => {
    try {
      const fetchedMessage = await message.fetch();
      await fetchedMessage.edit({ components: [] });
    } catch (error) {
      console.error('Error clearing buttons:', error);
    }
  }, BUTTON_TIMEOUT);
}