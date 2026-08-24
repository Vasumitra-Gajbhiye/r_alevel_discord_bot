const {
  ActionRowBuilder,
  AttachmentBuilder,
  ChannelType,
  EmbedBuilder,
  Events,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { ModmailTicket, ModmailBan, DEFAULT_MODMAIL_CATEGORIES } = require("@ralevel/db");
const { tryGetGuildConfig } = require("../utils/guildConfigStore");

const STAFF_EMBED_COLOR = 0x5865f2;
const USER_EMBED_COLOR = 0x57f287;
const NOTE_PREFIX = ".";

const SELECT_CUSTOM_ID = "modmail_category";
const MODAL_CUSTOM_ID_PREFIX = "modmail_modal:";
const DESCRIPTION_INPUT_ID = "modmail_description";

const FALLBACK_CATEGORIES =
  Array.isArray(DEFAULT_MODMAIL_CATEGORIES) && DEFAULT_MODMAIL_CATEGORIES.length
    ? DEFAULT_MODMAIL_CATEGORIES
    : [
        {
          value: "general",
          label: "General Query",
          description: "Questions that don't fit the other options",
        },
        {
          value: "advertise",
          label: "Permission to Advertise",
          description: "Request permission to advertise",
        },
        {
          value: "report",
          label: "Report a Member",
          description: "Report a member for misconduct",
        },
      ];

function getModMailChannelId() {
  const fromConfig = tryGetGuildConfig()?.modmail?.forumChannelId;
  if (typeof fromConfig === "string" && fromConfig.trim()) {
    return fromConfig.trim();
  }
  return process.env.MOD_MAIL_CHANNEL_ID || null;
}

function getModmailCategories() {
  const raw = tryGetGuildConfig()?.modmail?.categories;
  if (!Array.isArray(raw) || raw.length === 0) {
    return FALLBACK_CATEGORIES.map((c) => ({ ...c }));
  }

  const cleaned = raw
    .map((c) => ({
      value: String(c?.value ?? "").trim(),
      label: String(c?.label ?? "").trim(),
      description: String(c?.description ?? "").trim(),
    }))
    .filter((c) => c.value && c.label)
    .slice(0, 25);

  return cleaned.length
    ? cleaned
    : FALLBACK_CATEGORIES.map((c) => ({ ...c }));
}

function categoryLabel(category) {
  const match = getModmailCategories().find((c) => c.value === category);
  return match?.label || category;
}

function isValidCategory(category) {
  return getModmailCategories().some((c) => c.value === category);
}

function threadNameFor(user) {
  const raw = String(user.username || "user")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "")
    .slice(0, 80);
  return `modmail-${raw || user.id}`.slice(0, 100);
}

const MAX_FILES_PER_MESSAGE = 10;
const BASE_UPLOAD_LIMIT = 25 * 1024 * 1024;
const TIER2_UPLOAD_LIMIT = 50 * 1024 * 1024;
const TIER3_UPLOAD_LIMIT = 100 * 1024 * 1024;

function safeAttachmentName(attachment, fallbackBase) {
  const raw = attachment?.name || "";
  const extMatch = raw.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "bin";
  const base =
    String(fallbackBase || "file")
      .replace(/[^\w.-]+/g, "_")
      .replace(/^\.+/, "")
      .slice(0, 80) || "file";
  return `${base}.${ext}`;
}

function uniquifyFileName(desired, used) {
  const lower = desired.toLowerCase();
  if (!used.has(lower)) {
    used.add(lower);
    return desired;
  }
  const dot = desired.lastIndexOf(".");
  const stem = dot > 0 ? desired.slice(0, dot) : desired;
  const ext = dot > 0 ? desired.slice(dot) : "";
  let n = 2;
  let candidate;
  do {
    candidate = `${stem}-${n}${ext}`;
    n += 1;
  } while (used.has(candidate.toLowerCase()));
  used.add(candidate.toLowerCase());
  return candidate;
}

function attachmentFileName(attachment, index, used) {
  const raw = String(attachment?.name || "")
    .trim()
    .replace(/[/\\]/g, "_")
    .replace(/^\.+/, "");
  const fallback = safeAttachmentName(attachment, `modmail-${index + 1}`);
  const desired = raw ? raw.slice(0, 200) : fallback;
  return uniquifyFileName(desired, used);
}

function isGifAttachment(attachment) {
  const type = attachment?.contentType;
  if (typeof type === "string" && (type === "image/gif" || type.includes("gif"))) {
    return true;
  }
  return /\.gif$/i.test(String(attachment?.name || ""));
}

function isStaticImageAttachment(attachment) {
  if (isGifAttachment(attachment)) return false;
  const type = attachment?.contentType;
  if (typeof type === "string" && type.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|bmp)$/i.test(String(attachment?.name || ""));
}

function normalizeMediaUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return String(url || "");
  }
}

function isGifPickerUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    if (/(^|\.)tenor\.com$/.test(host)) return true;
    if (/(^|\.)giphy\.com$/.test(host)) return true;
    if (host === "media.tenor.com" || host === "c.tenor.com") return true;
    if (/\.gif$/i.test(parsed.pathname)) return true;
    if (
      /(?:cdn\.discordapp\.com|media\.discordapp\.net|discordapp\.(?:net|com))$/i.test(
        host
      ) &&
      /tenor|giphy|\.gif/i.test(url)
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function isGifSourceEmbed(embed) {
  if (!embed) return false;
  const type = String(embed.type || embed.data?.type || "").toLowerCase();
  if (type === "gifv") return true;
  const provider = String(
    embed.provider?.name || embed.data?.provider?.name || ""
  ).toLowerCase();
  if (provider === "tenor" || provider === "giphy") return true;
  const candidate =
    embed.url ||
    embed.video?.url ||
    embed.image?.url ||
    embed.thumbnail?.url ||
    "";
  if (type === "image" && (isGifPickerUrl(candidate) || /\.gif(?:$|\?)/i.test(candidate))) {
    return true;
  }
  if (embed.video && isGifPickerUrl(candidate)) return true;
  return false;
}

function gifEmbedMediaUrl(embed) {
  return (
    embed?.video?.url ||
    embed?.video?.proxyURL ||
    embed?.video?.proxy_url ||
    embed?.image?.url ||
    embed?.image?.proxyURL ||
    embed?.image?.proxy_url ||
    embed?.thumbnail?.proxyURL ||
    embed?.thumbnail?.proxy_url ||
    embed?.thumbnail?.url ||
    null
  );
}

function fileNameForMediaUrl(url, index, used) {
  let ext = "mp4";
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
    if (match) ext = match[1].toLowerCase();
    else if (/\.gif/i.test(url)) ext = "gif";
  } catch {
    if (/\.gif/i.test(url)) ext = "gif";
  }
  if (ext === "gifv") ext = "mp4";
  return uniquifyFileName(`gif-${index + 1}.${ext}`, used);
}

function gifPickerUrlsFromMessage(message) {
  const urls = new Set();
  for (const embed of message.embeds || []) {
    if (!isGifSourceEmbed(embed)) continue;
    if (embed.url) urls.add(normalizeMediaUrl(embed.url));
    const media = gifEmbedMediaUrl(embed);
    if (media) urls.add(normalizeMediaUrl(media));
  }
  return urls;
}

function relayTextContent(message) {
  let text = message.content?.trim() || "";
  if (!text) return "";

  const gifUrls = gifPickerUrlsFromMessage(message);
  const found = text.match(/https?:\/\/[^\s<]+/gi) || [];
  for (const raw of found) {
    const cleaned = raw.replace(/[),.;]+$/g, "");
    if (
      isGifPickerUrl(cleaned) ||
      gifUrls.has(normalizeMediaUrl(cleaned))
    ) {
      text = text.split(raw).join("");
    }
  }
  return text.replace(/\s+/g, " ").trim();
}

function stripSpoilerPrefix(name) {
  return String(name || "file").replace(/^SPOILER_/i, "");
}

function uploadLimitFor(destination) {
  const tier = destination?.guild?.premiumTier ?? 0;
  if (tier >= 3) return TIER3_UPLOAD_LIMIT;
  if (tier >= 2) return TIER2_UPLOAD_LIMIT;
  return BASE_UPLOAD_LIMIT;
}

function formatNameList(items) {
  const lines = items.map((item) => `• ${String(item).slice(0, 90)}`);
  let value = lines.join("\n");
  if (value.length > 1024) {
    value = `${value.slice(0, 1021)}...`;
  }
  return value;
}

function fileFailureEntries(files, reason) {
  return files.map((file) => ({
    name: stripSpoilerPrefix(file.name || "file"),
    reason,
  }));
}

function prepareRelayAttachments(message, { maxBytes } = {}) {
  const attachments = message.attachments?.size
    ? [...message.attachments.values()]
    : [];
  const files = [];
  const extraFiles = [];
  const failed = [];
  const nonImageNames = [];
  let firstImageName = null;
  const usedNames = new Set();
  const usedMediaUrls = new Set();

  function pushFile(file) {
    const bucket = files.length < MAX_FILES_PER_MESSAGE ? files : extraFiles;
    bucket.push(file);
    return bucket;
  }

  for (let i = 0; i < attachments.length; i++) {
    const attachment = attachments[i];
    const name = attachmentFileName(attachment, i, usedNames);
    const displayName = attachment.name || name;

    if (!attachment.url) {
      failed.push({ name: displayName, reason: "unavailable" });
      continue;
    }

    if (
      typeof maxBytes === "number" &&
      typeof attachment.size === "number" &&
      attachment.size > maxBytes
    ) {
      failed.push({ name: displayName, reason: "too large" });
      continue;
    }

    const file = new AttachmentBuilder(attachment.url, {
      name,
      spoiler: Boolean(attachment.spoiler),
    });
    const bucket = pushFile(file);
    usedMediaUrls.add(normalizeMediaUrl(attachment.url));

    if (isStaticImageAttachment(attachment)) {
      if (!firstImageName && !attachment.spoiler && bucket === files) {
        const uploadedName = file.name || name;
        if (!/^SPOILER_/i.test(uploadedName)) {
          firstImageName = uploadedName;
        }
      }
    } else if (!isGifAttachment(attachment)) {
      nonImageNames.push(displayName);
    }
  }

  const gifEmbeds = (message.embeds || []).filter(isGifSourceEmbed);
  for (let i = 0; i < gifEmbeds.length; i++) {
    const embed = gifEmbeds[i];
    const url = gifEmbedMediaUrl(embed);
    const displayName = `gif-${i + 1}`;
    if (!url) {
      failed.push({ name: displayName, reason: "unavailable" });
      continue;
    }
    if (usedMediaUrls.has(normalizeMediaUrl(url))) continue;

    const name = fileNameForMediaUrl(url, i, usedNames);
    const file = new AttachmentBuilder(url, { name });
    pushFile(file);
    usedMediaUrls.add(normalizeMediaUrl(url));
  }

  return { files, extraFiles, failed, nonImageNames, firstImageName };
}

function applyRelayAttachmentFields(embed, { nonImageNames = [], failed = [] } = {}) {
  if (nonImageNames.length) {
    embed.addFields({
      name: "Attachments",
      value: formatNameList(nonImageNames),
    });
  }
  if (failed.length) {
    embed.addFields({
      name: "Could not attach",
      value: formatNameList(
        failed.map((item) => `${item.name} (${item.reason})`)
      ),
    });
  }
}

function hasRelayableContent(message) {
  return (
    Boolean(relayTextContent(message)) ||
    Boolean(message.content?.trim()) ||
    Boolean(message.attachments?.size) ||
    (message.embeds || []).some(isGifSourceEmbed)
  );
}

function buildUserRelayEmbed(message, relay = {}) {
  const embed = new EmbedBuilder()
    .setColor(USER_EMBED_COLOR)
    .setAuthor({
      name: message.author.tag,
      iconURL: message.author.displayAvatarURL({ size: 128 }),
    })
    .setFooter({ text: `User ID: ${message.author.id}` })
    .setTimestamp(message.createdAt);

  const description = relayTextContent(message);
  if (description) {
    embed.setDescription(description);
  }

  if (relay.firstImageName) {
    embed.setImage(`attachment://${relay.firstImageName}`);
  }

  applyRelayAttachmentFields(embed, relay);
  return embed;
}

function buildDescriptionEmbed(user, description) {
  return new EmbedBuilder()
    .setColor(USER_EMBED_COLOR)
    .setAuthor({
      name: user.tag,
      iconURL: user.displayAvatarURL({ size: 128 }),
    })
    .setDescription(description.slice(0, 4096))
    .setFooter({ text: `User ID: ${user.id}` })
    .setTimestamp();
}

function buildStaffRelayEmbed(message, relay = {}) {
  const embed = new EmbedBuilder()
    .setColor(STAFF_EMBED_COLOR)
    .setAuthor({ name: "Staff" })
    .setTimestamp(message.createdAt);

  const description = relayTextContent(message);
  if (description) {
    embed.setDescription(description);
  }

  if (relay.firstImageName) {
    embed.setImage(`attachment://${relay.firstImageName}`);
  }

  applyRelayAttachmentFields(embed, relay);
  return embed;
}

async function sendRelayedMessage(target, message, buildEmbed) {
  const prepared = prepareRelayAttachments(message, {
    maxBytes: uploadLimitFor(target),
  });

  const sendOnce = async (relay) => {
    const embed = buildEmbed(message, relay);
    const payload = { embeds: [embed] };
    if (relay.files?.length) payload.files = relay.files;
    await target.send(payload);
  };

  try {
    await sendOnce(prepared);
  } catch (err) {
    if (!prepared.files.length) throw err;
    console.error("[modmail] Failed to rehost attachments:", err);
    await sendOnce({
      files: [],
      extraFiles: [],
      failed: [
        ...prepared.failed,
        ...fileFailureEntries(prepared.files, "too large or unavailable"),
        ...fileFailureEntries(prepared.extraFiles, "too large or unavailable"),
      ],
      nonImageNames: [],
      firstImageName: null,
    });
    return;
  }

  for (let i = 0; i < prepared.extraFiles.length; i += MAX_FILES_PER_MESSAGE) {
    const batch = prepared.extraFiles.slice(i, i + MAX_FILES_PER_MESSAGE);
    try {
      await target.send({ files: batch });
    } catch (err) {
      console.error("[modmail] Failed to rehost extra attachments:", err);
      await target
        .send({
          embeds: [
            new EmbedBuilder().setColor(0xed4245).addFields({
              name: "Could not attach",
              value: formatNameList(
                batch.map(
                  (file) =>
                    `${stripSpoilerPrefix(file.name || "file")} (too large or unavailable)`
                )
              ),
            }),
          ],
        })
        .catch((followErr) => {
          console.error(
            "[modmail] Failed to report extra attachment error:",
            followErr
          );
        });
    }
  }
}

function buildOpenerEmbed(user, category) {
  return new EmbedBuilder()
    .setColor(STAFF_EMBED_COLOR)
    .setTitle("Modmail")
    .setDescription(
      "Messages here are relayed anonymously to the user via DM.\n" +
        `Prefix a message with \`${NOTE_PREFIX}\` to keep it staff-only.`
    )
    .addFields(
      { name: "User", value: `${user} (\`${user.tag}\`)`, inline: true },
      { name: "User ID", value: user.id, inline: true },
      { name: "Category", value: categoryLabel(category), inline: true }
    )
    .setTimestamp();
}

function buildTicketOpenedDmEmbed(category, description) {
  return new EmbedBuilder()
    .setColor(STAFF_EMBED_COLOR)
    .setTitle("Ticket opened")
    .setDescription(
      "Staff will reply here — please keep this DM open.\n\n" +
        "**Your message**\n" +
        description.slice(0, 3900)
    )
    .addFields({
      name: "Category",
      value: categoryLabel(category).slice(0, 1024),
      inline: true,
    })
    .setTimestamp();
}

function buildSupportMenuMessage() {
  const embed = new EmbedBuilder()
    .setColor(STAFF_EMBED_COLOR)
    .setTitle("GET SUPPORT")
    .setDescription(
      [
        "Please select the most relevant option below to open a Support Ticket!",
        "",
        "⭐ If you're a booster, you'll receive Priority Support!",
        "",
        "❗ Misuse of this system will result in infractions.",
      ].join("\n")
    );

  const select = new StringSelectMenuBuilder()
    .setCustomId(SELECT_CUSTOM_ID)
    .setPlaceholder("Select a support category")
    .addOptions(
      getModmailCategories().map((category) => {
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(category.label.slice(0, 100))
          .setValue(category.value.slice(0, 100));
        if (category.description) {
          option.setDescription(category.description.slice(0, 100));
        }
        return option;
      })
    );

  return {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(select)],
  };
}

async function ensureThreadWritable(thread) {
  if (thread.archived) {
    await thread.setArchived(false);
  }
}

async function findOpenTicketByUser(userId) {
  return ModmailTicket.findOne({ userId, status: "OPEN" });
}

async function findOpenTicketByThread(threadId) {
  return ModmailTicket.findOne({ threadId, status: "OPEN" });
}

async function closeTicketAsSystem(ticket) {
  // Use updateOne so legacy docs (missing threadId/category) still close
  // without failing full-document validation.
  await ModmailTicket.updateOne(
    { _id: ticket._id },
    {
      $set: {
        status: "CLOSED",
        closedAt: new Date(),
        closedBy: "system",
      },
    }
  );
}


function buildBannedFromModmailEmbed(reason, { ticketClosed = false } = {}) {
  const description = ticketClosed
    ? `You are banned from using modmail.\n\n**Reason:** ${reason}\n\nYour open support ticket has been closed.`
    : `You are banned from using modmail.\n\n**Reason:** ${reason}`;

  return new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle("Banned from Modmail")
    .setDescription(description)
    .setTimestamp();
}

async function findModmailBan(userId) {
  return ModmailBan.findOne({ userId }).lean();
}

/**
 * Mark a ticket CLOSED and optionally archive its forum thread.
 * Caller is responsible for any user-facing DM.
 */
async function closeOpenTicket(ticket, { closedBy, thread, archiveReason } = {}) {
  await ModmailTicket.updateOne(
    { _id: ticket._id },
    {
      $set: {
        status: "CLOSED",
        closedAt: new Date(),
        closedBy: closedBy || "system",
      },
    }
  );

  if (!thread) {
    return { archived: false };
  }

  try {
    if (!thread.archived) {
      await thread.setArchived(
        true,
        archiveReason || "Modmail ticket closed"
      );
    }
    return { archived: true };
  } catch (err) {
    console.error("[modmail] Failed to archive ticket thread:", err);
    return { archived: false, archiveError: err };
  }
}


async function createModmailThread(client, user, category, description) {
  const forumId = getModMailChannelId();
  if (!forumId) {
    throw new Error("Modmail forum channel is not configured");
  }

  const forum = await client.channels.fetch(forumId);
  if (!forum || forum.type !== ChannelType.GuildForum) {
    throw new Error("Modmail forum channel must be a Discord forum channel");
  }

  async function createOnce() {
    let thread;
    try {
      thread = await forum.threads.create({
        name: threadNameFor(user),
        message: {
          embeds: [buildOpenerEmbed(user, category)],
        },
        reason: `Modmail thread for ${user.tag} (${category})`,
      });

      await thread.send({ embeds: [buildDescriptionEmbed(user, description)] });

      const ticket = await ModmailTicket.create({
        userId: user.id,
        threadId: thread.id,
        guildId: forum.guildId,
        category,
        status: "OPEN",
      });

      return { thread, ticket };
    } catch (err) {
      // Avoid leaving orphan forum posts if DB insert fails.
      if (thread) {
        await thread.delete("Modmail ticket DB create failed").catch(() => {});
      }
      throw err;
    }
  }

  try {
    return await createOnce();
  } catch (err) {
    // Legacy unique index on channelId (null) — repair and retry once.
    if (err?.code === 11000 && typeof ModmailTicket.ensureModmailIndexes === "function") {
      console.warn(
        "[modmail] Duplicate key on ticket create; repairing indexes and retrying once."
      );
      await ModmailTicket.ensureModmailIndexes();
      return await createOnce();
    }
    throw err;
  }
}

async function sendSupportMenu(channel) {
  await channel.send(buildSupportMenuMessage());
}

async function handleModmailDm(client, message) {
  if (message.author.bot || message.guild) return;

  try {
    let ticket = await findOpenTicketByUser(message.author.id);

    if (ticket) {
      const thread = await client.channels
        .fetch(ticket.threadId)
        .catch(() => null);

      if (!thread) {
        await closeTicketAsSystem(ticket);
        ticket = null;
      } else {
        if (!hasRelayableContent(message)) return;
        await ensureThreadWritable(thread);
        await sendRelayedMessage(thread, message, buildUserRelayEmbed);
        return;
      }
    }

    const ban = await findModmailBan(message.author.id);
    if (ban) {
      await message.channel.send({
        embeds: [buildBannedFromModmailEmbed(ban.reason)],
      });
      return;
    }

    // No open ticket — show intake menu (any non-bot DM triggers it)
    await sendSupportMenu(message.channel);
  } catch (err) {
    console.error("[modmail] Failed to handle DM:", err);
    await message.channel
      .send(
        "Sorry, I couldn't process your message right now. Please try again later."
      )
      .catch(() => {});
  }
}

async function handleModmailStaffReply(client, message) {
  if (message.author.bot || !message.guild) return false;

  const forumId = getModMailChannelId();
  if (
    !forumId ||
    !message.channel.isThread?.() ||
    message.channel.parentId !== forumId
  ) {
    return false;
  }

  const openTicket = await findOpenTicketByThread(message.channel.id);
  if (!openTicket) {
    // Still claim closed/unknown modmail forum posts so XP/sticky/rep skip them.
    const anyTicket = await ModmailTicket.findOne({
      threadId: message.channel.id,
    })
      .select("_id")
      .lean();
    return Boolean(anyTicket);
  }

  if (!hasRelayableContent(message)) return true;

  const content = message.content?.trim() || "";
  if (content.startsWith(NOTE_PREFIX)) return true;

  try {
    await ensureThreadWritable(message.channel);
    const user = await client.users.fetch(openTicket.userId);
    await sendRelayedMessage(user, message, buildStaffRelayEmbed);
  } catch (err) {
    console.error("[modmail] Failed to DM user:", err);
    await message.channel
      .send(
        "Could not deliver that message — the user may have DMs closed."
      )
      .catch(() => {});
  }

  return true;
}

async function handleCategorySelect(interaction) {
  const category = interaction.values?.[0];
  if (!isValidCategory(category)) {
    return interaction.reply({
      content: "Invalid category selected. Please try again.",
      ephemeral: true,
    });
  }

  const ban = await findModmailBan(interaction.user.id);
  if (ban) {
    return interaction.reply({
      embeds: [buildBannedFromModmailEmbed(ban.reason)],
      ephemeral: true,
    });
  }

  const existing = await findOpenTicketByUser(interaction.user.id);
  if (existing) {
    return interaction.reply({
      content:
        "You already have an open support ticket. Reply in this DM to continue that conversation.",
      ephemeral: true,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId(`${MODAL_CUSTOM_ID_PREFIX}${category}`)
    .setTitle("Describe your problem");

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(DESCRIPTION_INPUT_ID)
        .setLabel("Describe your problem")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(4000)
    )
  );

  return interaction.showModal(modal);
}

async function handleModalSubmit(client, interaction) {
  const category = interaction.customId.slice(MODAL_CUSTOM_ID_PREFIX.length);
  if (!isValidCategory(category)) {
    return interaction.reply({
      content: "Invalid ticket category. Please start again by DMing me.",
      ephemeral: true,
    });
  }

  const description = interaction.fields
    .getTextInputValue(DESCRIPTION_INPUT_ID)
    ?.trim();

  if (!description) {
    return interaction.reply({
      content: "Please provide a description of your problem.",
      ephemeral: true,
    });
  }

  const ban = await findModmailBan(interaction.user.id);
  if (ban) {
    return interaction.reply({
      embeds: [buildBannedFromModmailEmbed(ban.reason)],
      ephemeral: true,
    });
  }

  const existing = await findOpenTicketByUser(interaction.user.id);
  if (existing) {
    return interaction.reply({
      content:
        "You already have an open support ticket. Reply in this DM to continue that conversation.",
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    await createModmailThread(
      client,
      interaction.user,
      category,
      description
    );

    await interaction.editReply({
      content: "Your support ticket has been opened.",
    });

    try {
      await interaction.user.send({
        embeds: [buildTicketOpenedDmEmbed(category, description)],
      });
    } catch (dmErr) {
      console.error(
        "[modmail] Ticket created but failed to DM confirmation:",
        dmErr
      );
    }
  } catch (err) {
    console.error("[modmail] Failed to create ticket from modal:", err);
    await interaction.editReply({
      content:
        "Sorry, I couldn't open your ticket right now. Please try again later.",
    });
  }
}

function modmailSystem(client) {
  if (!getModMailChannelId()) {
    console.warn(
      "[modmail] Forum channel is not set in guild config (or MOD_MAIL_CHANNEL_ID) — ticket creation will fail until configured."
    );
  }

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (
        interaction.isStringSelectMenu() &&
        interaction.customId === SELECT_CUSTOM_ID
      ) {
        await handleCategorySelect(interaction);
        return;
      }

      if (
        interaction.isModalSubmit() &&
        interaction.customId.startsWith(MODAL_CUSTOM_ID_PREFIX)
      ) {
        await handleModalSubmit(client, interaction);
      }
    } catch (err) {
      console.error("[modmail] Interaction handler failed:", err);
      if (interaction.deferred || interaction.replied) {
        await interaction
          .followUp({
            content: "Something went wrong. Please try again.",
            ephemeral: true,
          })
          .catch(() => {});
      } else {
        await interaction
          .reply({
            content: "Something went wrong. Please try again.",
            ephemeral: true,
          })
          .catch(() => {});
      }
    }
  });

  return {
    handleModmailDm: (message) => handleModmailDm(client, message),
    handleModmailStaffReply: (message) =>
      handleModmailStaffReply(client, message),
  };
};

modmailSystem.closeOpenTicket = closeOpenTicket;
modmailSystem.findOpenTicketByUser = findOpenTicketByUser;
modmailSystem.buildBannedFromModmailEmbed = buildBannedFromModmailEmbed;

module.exports = modmailSystem;
