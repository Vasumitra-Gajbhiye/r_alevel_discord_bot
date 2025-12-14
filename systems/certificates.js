// // systems/certificates.js
// const {
//   Events,
//   ActionRowBuilder,
//   ButtonBuilder,
//   ButtonStyle,
//   EmbedBuilder,
//   ModalBuilder,
//   TextInputBuilder,
//   TextInputStyle,
//   InteractionType,
//   PermissionsBitField,
// } = require("discord.js");

// const Certificate = require("../models/certificate.js");
// const Reputation = require("../models/reputation.js");

// // CONFIG - update these if needed
// const APPLICATION_CHANNEL = "1442441433268097157";
// const REVIEW_CHANNEL = "1442441607671451648";
// const ROLE_SR_HELPER = "1437727634711777450";
// const ADMIN_ROLE_ID = "1114451108811767928"; // only admins can approve/reject
// const RESOURCE_CONTRIBUTOR_ROLE = "1442441946738982963"; // optional

// // How long we wait for applicant DM reply (ms)
// const DM_DETAILS_TIMEOUT = 1000 * 60 * 60; // 60 minutes

// module.exports = function certificateSystem(client) {
//   // utility: get rep count (safe)
//   async function getRepCount(userId) {
//     try {
//       const doc = await Reputation.findOne({ userId });
//       return doc?.rep ?? 0;
//     } catch {
//       return 0;
//     }
//   }

//   // Send application panel when bot is ready
//   client.once(Events.ClientReady, async () => {
//     try {
//       const channel = await client.channels.fetch(APPLICATION_CHANNEL).catch(() => null);
//       if (!channel) return console.error("[certificates] Application channel not found.");

//       const embed = new EmbedBuilder()
//         .setTitle("📜 Apply for a Certificate")
//         .setDescription(
//           "**How to apply**\nClick the button for the certificate you want to apply for.\n\n" +
//             "**Eligibility (examples)**\n• Helper: Senior Helpers only (must have Senior Helper role)\n• Writer: Contributed articles\n• Resource Contributor: Provided verified resources\n\n" +
//             "Applications are reviewed by moderators. You'll be DM'd about the result."
//         )
//         .setColor("#5865F2")
//         .setFooter({ text: "Only one pending application per certificate type is allowed." })
//         .setTimestamp();

//       const row = new ActionRowBuilder().addComponents(
//         new ButtonBuilder().setCustomId("apply_helper").setLabel("Apply: Helper").setStyle(ButtonStyle.Primary),
//         new ButtonBuilder().setCustomId("apply_writer").setLabel("Apply: Writer").setStyle(ButtonStyle.Success),
//         new ButtonBuilder().setCustomId("apply_resource").setLabel("Apply: Resource Contributor").setStyle(ButtonStyle.Secondary)
//       );

//       // Send once (if you prefer to ensure idempotency you can search for existing bot message and skip)
//       await channel.send({ embeds: [embed], components: [row] });
//       console.log("✅ Certificate application panel sent.");
//     } catch (err) {
//       console.error("[certificates] Error sending application panel:", err);
//     }
//   });

//   // Keep track of DM collectors so we don't open more than one per applicant
//   const awaitingDetails = new Map(); // appId -> collector cleanup function

//   // Unified InteractionCreate handler (buttons + modal submits)
//   client.on(Events.InteractionCreate, async (interaction) => {
//     try {
//       // ---------- MODAL SUBMIT (reject reason) ----------
//       if (interaction.type === InteractionType.ModalSubmit) {
//         const customId = interaction.customId;
//         if (!customId?.startsWith("cert_reject_modal:")) return;

//         // Defer reply for modal submit (ephemeral)
//         await interaction.deferReply({ ephemeral: true });

//         const appId = customId.split(":")[1];
//         const reason = interaction.fields.getTextInputValue("reject_reason") || "No reason provided";

//         const app = await Certificate.findById(appId);
//         if (!app) {
//           return interaction.editReply({ content: "❌ Application not found." });
//         }

//         // Admin-only check
//         const member = interaction.member;
//         if (!member || !member.roles.cache.has(ADMIN_ROLE_ID)) {
//           return interaction.editReply({ content: "❌ You are not allowed to perform this action." });
//         }

//         if (app.status !== "pending") {
//           return interaction.editReply({ content: "⚠️ This application has already been processed." });
//         }

//         app.status = "rejected";
//         app.reason = reason.slice(0, 1000);
//         app.moderatorId = interaction.user.id;
//         app.resolvedAt = new Date();
//         await app.save();

//         // notify applicant via DM
//         try {
//           const u = await client.users.fetch(app.userId).catch(() => null);
//           if (u) {
//             await u.send({
//               embeds: [
//                 new EmbedBuilder()
//                   .setTitle("❌ Certificate Application Rejected")
//                   .setDescription(`Your application for **${app.type}** has been rejected.`)
//                   .addFields({ name: "Reason", value: reason.slice(0, 1024) })
//                   .setColor("#ff4d4d")
//                   .setTimestamp(),
//               ],
//             }).catch(() => {});
//           }
//         } catch {}

//         await interaction.editReply({ content: `✅ Application rejected and user notified.` });
//         return;
//       }

//       // ---------- BUTTONS ----------
//       if (!interaction.isButton()) return;

//       const { customId, user, guild, channel } = interaction;

//       // APPLY buttons: apply_helper, apply_writer, apply_resource
//       if (customId === "apply_helper" || customId === "apply_writer" || customId === "apply_resource") {
//         // Defer reply immediately (ephemeral) to avoid unknown-interaction on long ops
//         await interaction.deferReply({ ephemeral: true });

//         // type mapping
//         const typeMap = {
//           apply_helper: "Helper",
//           apply_writer: "Writer",
//           apply_resource: "Resource Contributor",
//         };
//         const type = typeMap[customId];

//         // must be in-guild for membership checks
//         if (!guild) {
//           return interaction.editReply({ content: "❌ You must use this inside the server." });
//         }

//         const member = await guild.members.fetch(user.id).catch(() => null);
//         if (!member) return interaction.editReply({ content: "❌ Couldn't fetch your server profile." });

//         // eligibility: helper requires SR role
//         if (customId === "apply_helper" && !member.roles.cache.has(ROLE_SR_HELPER)) {
//           return interaction.editReply({
//             content:
//               "❌ **You are not eligible for the Helper Certificate.**\n\n" +
//               "Only Senior Helpers may apply at this time.\n\n" +
//               "**Eligibility (examples):**\n" +
//               "• Junior Helper → 30 rep + activity\n" +
//               "• Senior Helper → 100 rep + 1 month activity\n\n" +
//               "If you believe this is an error, contact staff.",
//           });
//         }

//         // Prevent duplicate pending application of same type
//         const existing = await Certificate.findOne({ userId: user.id, type: type, status: "pending" });
//         if (existing) {
//           return interaction.editReply({
//             content: `⚠️ You already have a pending ${type} application (submitted at ${existing.createdAt.toUTCString()}).`,
//           });
//         }

//         // gather rep + join date
//         const rep = await getRepCount(user.id);
//         const joinedAt = member.joinedAt ?? null;

//         // create application
//         const app = await Certificate.create({
//           userId: user.id,
//           userTag: user.tag,
//           type,
//           rep,
//           joinedAt,
//           appliedChannelId: channel?.id ?? null,
//           status: "pending",
//         });

//         // send review embed to REVIEW_CHANNEL
//         const reviewChannel = await client.channels.fetch(REVIEW_CHANNEL).catch(() => null);
//         const appEmbed = new EmbedBuilder()
//           .setTitle("📨 New Certificate Application")
//           .setColor("#5865F2")
//           .addFields(
//             { name: "Applicant", value: `${user.tag} (${user.id})`, inline: true },
//             { name: "Type", value: type, inline: true },
//             { name: "Rep", value: String(rep), inline: true },
//             { name: "Joined", value: joinedAt ? `<t:${Math.floor(joinedAt.getTime() / 1000)}:R>` : "Unknown", inline: true },
//             { name: "Submitted", value: `<t:${Math.floor(app.createdAt.getTime() / 1000)}:F>`, inline: true },
//             { name: "Application ID", value: app._id.toString(), inline: false }
//           )
//           .setFooter({ text: `Submitted in ${channel ? `#${channel.name}` : "unknown channel"}` });

//         if (reviewChannel) {
//           const approveId = `cert_approve:${app._id.toString()}`;
//           const rejectId = `cert_reject:${app._id.toString()}`;
//           const reviewRow = new ActionRowBuilder().addComponents(
//             new ButtonBuilder().setCustomId(approveId).setLabel("Approve").setStyle(ButtonStyle.Success),
//             new ButtonBuilder().setCustomId(rejectId).setLabel("Reject").setStyle(ButtonStyle.Danger)
//           );
//           await reviewChannel.send({ embeds: [appEmbed], components: [reviewRow] }).catch(() => {});
//         } else {
//           console.warn("[certificates] Review channel not found; admins will not see this automatically.");
//         }

//         // DM applicant
//         try {
//           const u = await client.users.fetch(user.id);
//           if (u) {
//             await u.send({
//               embeds: [
//                 new EmbedBuilder()
//                   .setTitle("✅ Application Submitted")
//                   .setDescription(`Your application for **${type}** has been submitted and is awaiting review.`)
//                   .addFields(
//                     { name: "Application ID", value: app._id.toString(), inline: false },
//                     { name: "Rep", value: String(rep), inline: true },
//                     { name: "Joined", value: joinedAt ? `<t:${Math.floor(joinedAt.getTime() / 1000)}:R>` : "Unknown", inline: true }
//                   )
//                   .setColor("#00B894"),
//               ],
//             }).catch(() => {});
//           }
//         } catch {}

//         await interaction.editReply({ content: `✅ Your ${type} application has been submitted and queued for review.` });
//         return;
//       }

//       // ---------- REVIEW ACTIONS (approve/reject buttons) ----------
//       if (customId.startsWith("cert_approve:") || customId.startsWith("cert_reject:")) {
//         // Admin check
//         const member = interaction.member;
//         if (!member || !member.roles.cache.has(ADMIN_ROLE_ID)) {
//           return interaction.reply({ content: "❌ Only admins may perform this action.", ephemeral: true });
//         }

//         const [action, appId] = customId.split(":");
//         const app = await Certificate.findById(appId);
//         if (!app) {
//           return interaction.reply({ content: "❌ Application not found.", ephemeral: true });
//         }

//         // APPROVE
//         if (action === "cert_approve") {
//           if (app.status !== "pending") {
//             return interaction.reply({ content: "⚠️ This application has already been processed.", ephemeral: true });
//           }

//           // Defer immediately (we're doing DB & DM work)
//           await interaction.deferReply({ ephemeral: true });

//           app.status = "approved";
//           app.moderatorId = interaction.user.id;
//           app.resolvedAt = new Date();
//           await app.save();

//           // assign resource role if applicable
//           if (app.type.toLowerCase().includes("resource") && interaction.guild) {
//             try {
//               const guildMember = await interaction.guild.members.fetch(app.userId).catch(() => null);
//               if (guildMember) await guildMember.roles.add(RESOURCE_CONTRIBUTOR_ROLE).catch(() => {});
//             } catch (err) {
//               console.warn("[certificates] Could not assign resource role:", err);
//             }
//           }

//           // DM applicant asking for details (name | email)
//           try {
//             const u = await client.users.fetch(app.userId).catch(() => null);
//             if (u) {
//               await u.send({
//                 embeds: [
//                   new EmbedBuilder()
//                     .setTitle("✅ Application Approved — Next Step")
//                     .setDescription(
//     `Your application for **${app.type}** has been approved! 🎉\n\n` +
//     `To receive your certificate, please run:\n` +
//     `**/submit-cert-details application_id:${app._id} name:<Your Name> email:<Your Email>**\n\n` +
//     `Alternatively, you may email us at **r.alevelserver@gmail.com**.\n` +
//     `⚠️ Name cannot be changed later.`
// )
//                     .setColor("#00C851")
//                     .setTimestamp(),
//                 ],
//               }).catch(() => {});
//             }

//             // start a DM collector to capture name & email (one-time)
//             // If the user cannot be DM'd we just continue (admin was notified)
//             const dmChannel = await u?.createDM().catch(() => null);
//             if (dmChannel) {
//               // prevent duplicate collectors for same application
//               if (awaitingDetails.has(app._id.toString())) {
//                 // already waiting — ignore
//               } else {
//                 const filter = (m) => m.author.id === app.userId;
//                 const collector = dmChannel.createMessageCollector({ filter, time: DM_DETAILS_TIMEOUT, max: 1 });

//                 awaitingDetails.set(app._id.toString(), () => collector.stop());

//                 collector.on("collect", async (m) => {
//                   const raw = m.content.trim();
//                   // expect "Name | email"
//                   const parts = raw.split("|").map(p => p.trim()).filter(Boolean);
//                   if (parts.length < 2) {
//                     m.channel.send("❌ Invalid format. Please send `Full Name | email@example.com` in one message.").catch(() => {});
//                     // allow admins to re-run? for simplicity, end collector and mark incomplete
//                     collector.stop("invalid");
//                     return;
//                   }
//                   const [name, email] = parts;
//                   const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
//                   if (!emailValid) {
//                     m.channel.send("❌ Invalid email format. Please try again with a valid email.").catch(() => {});
//                     collector.stop("invalid");
//                     return;
//                   }

//                   // Save details and finalize application
//                   app.status = "completed";
//                   app.nameOnCertificate = name.slice(0, 200);
//                   app.email = email.slice(0, 254);
//                   app.completedAt = new Date();
//                   await app.save();

//                   // Notify user and review channel
//                   m.channel.send("✅ Thank you! Your certificate details have been saved. We'll email you when it's ready.").catch(() => {});
//                   const reviewChannel = await client.channels.fetch(REVIEW_CHANNEL).catch(() => null);
//                   if (reviewChannel) {
//                     reviewChannel.send({
//                       content: `✅ Application **${app._id}** completed: name/email provided by ${app.userTag}.`,
//                     }).catch(() => {});
//                   }
//                 });

//                 collector.on("end", (collected, reason) => {
//                   awaitingDetails.delete(app._id.toString());
//                   if (reason === "time") {
//                     // mark app as waiting_details or notify admins
//                     // keep it in 'approved' state but add a note
//                     Certificate.findByIdAndUpdate(app._id, { waitingForDetails: true }).catch(() => {});
//                     // notify review channel
//                     client.channels.fetch(REVIEW_CHANNEL).then(ch => {
//                       if (ch) ch.send(`⏳ Application **${app._id}** approved but user did not provide details within time limit.`).catch(() => {});
//                     }).catch(() => {});
//                   } else if (reason === "invalid") {
//                     client.channels.fetch(REVIEW_CHANNEL).then(ch => {
//                       if (ch) ch.send(`⚠️ Application **${app._id}**: applicant provided invalid details; admin follow-up needed.`).catch(() => {});
//                     }).catch(() => {});
//                   }
//                 });
//               }
//             }
//           } catch (err) {
//             console.warn("[certificates] Could not DM applicant for details:", err);
//           }

//           // update moderator (ephemeral)
//           await interaction.editReply({ content: `✅ Application **${app._id}** approved. Applicant notified.` });
//           return;
//         }

//         // REJECT (button) -> Show modal to collect reason (must not defer before calling showModal)
//         if (action === "cert_reject") {
//           if (app.status !== "pending") {
//             return interaction.reply({ content: "⚠️ This application has already been processed.", ephemeral: true });
//           }

//           // build modal
//           const modal = new ModalBuilder()
//             .setCustomId(`cert_reject_modal:${app._id.toString()}`)
//             .setTitle("Reject Certificate Application");

//           const reasonInput = new TextInputBuilder()
//             .setCustomId("reject_reason")
//             .setLabel("Reason for rejection (sent to applicant)")
//             .setStyle(TextInputStyle.Paragraph)
//             .setPlaceholder("Provide the reason for rejection")
//             .setRequired(true)
//             .setMinLength(3)
//             .setMaxLength(1000);

//           modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));

//           // show modal (do NOT defer before this)
//           return interaction.showModal(modal);
//         }
//       }
//     } catch (err) {
//       console.error("[certificates] Interaction error:", err);
//       try {
//         if (!interaction.replied && !interaction.deferred) {
//           await interaction.reply({ content: "⚠️ Error processing request.", ephemeral: true });
//         } else if (interaction.deferred && !interaction.replied) {
//           await interaction.editReply({ content: "⚠️ Error processing request." });
//         }
//       } catch {}
//     }
//   });
// };

// systems/certificates.js

///////////////////////////////////////////////////////////////////

// const {
//   Events,
//   ActionRowBuilder,
//   ButtonBuilder,
//   ButtonStyle,
//   EmbedBuilder,
//   ModalBuilder,
//   TextInputBuilder,
//   TextInputStyle,
//   InteractionType
// } = require("discord.js");

// const Certificate = require("../models/certificate.js");
// const Reputation = require("../models/reputation.js");

// const APPLICATION_CHANNEL = "1442441433268097157";
// const REVIEW_CHANNEL = "1442441607671451648";
// const ROLE_SR_HELPER = "1437727634711777450";
// const ADMIN_ROLE_ID = "1114451108811767928";
// const RESOURCE_CONTRIBUTOR_ROLE = "1442441946738982963";

// module.exports = function certificateSystem(client) {

//   // -------------------------------------------------------------
//   // SEND APPLICATION PANEL
//   // -------------------------------------------------------------
//   client.once(Events.ClientReady, async () => {
//     try {
//       const channel = await client.channels.fetch(APPLICATION_CHANNEL);
//       if (!channel) return;

//       const embed = new EmbedBuilder()
//         .setTitle("📜 Apply for a Certificate")
//         .setDescription(
//           "**Click a button to apply.**\n\n" +
//           "• Helper Certificate (Senior Helpers only)\n" +
//           "• Writer Certificate\n" +
//           "• Resource Contributor Certificate\n\n" +
//           "You will be DM’d upon approval."
//         )
//         .setColor("#5865F2");

//       const row = new ActionRowBuilder().addComponents(
//         new ButtonBuilder().setCustomId("apply_helper").setLabel("Apply: Helper").setStyle(ButtonStyle.Primary),
//         new ButtonBuilder().setCustomId("apply_writer").setLabel("Apply: Writer").setStyle(ButtonStyle.Success),
//         new ButtonBuilder().setCustomId("apply_resource").setLabel("Apply: Resource").setStyle(ButtonStyle.Secondary)
//       );

//       await channel.send({ embeds: [embed], components: [row] });

//       console.log("✅ Certificate application panel sent.");
//     } catch (err) {
//       console.error(err);
//     }
//   });

//   // -------------------------------------------------------------
//   // SUBMIT APPLICATION
//   // -------------------------------------------------------------
//   client.on(Events.InteractionCreate, async (interaction) => {
//     if (!interaction.isButton()) return;

//     const { customId, user, guild, channel } = interaction;

//     // 3 possible buttons
//     let type = null;
//     if (customId === "apply_helper") type = "Helper";
//     if (customId === "apply_writer") type = "Writer";
//     if (customId === "apply_resource") type = "Resource Contributor";

//     if (!type) return;

//     await interaction.deferReply({ ephemeral: true });

//     const member = await guild.members.fetch(user.id);

//     if (customId === "apply_helper" && !member.roles.cache.has(ROLE_SR_HELPER)) {
//       return interaction.editReply({
//         content:
//           "❌ You are **not eligible** for the Helper Certificate.\n" +
//           "Only **Senior Helpers** can apply.\n\nIf this is an error, contact staff."
//       });
//     }

//     const existing = await Certificate.findOne({ userId: user.id, type, status: "pending" });
//     if (existing) {
//       return interaction.editReply({ content: `⚠️ You already have a pending ${type} application.` });
//     }

//     const repDoc = await Reputation.findOne({ userId: user.id });
//     const rep = repDoc?.rep ?? 0;
//     const joinedAt = member.joinedAt;

//     const app = await Certificate.create({
//       userId: user.id,
//       userTag: user.tag,
//       type,
//       rep,
//       joinedAt,
//       status: "pending"
//     });

//     // Send to review channel
//     const reviewChannel = await client.channels.fetch(REVIEW_CHANNEL);
//     const embed = new EmbedBuilder()
//       .setTitle("📨 New Certificate Application")
//       .setColor("#5865F2")
//       .addFields(
//         { name: "User", value: `${user.tag} (${user.id})`, inline: true },
//         { name: "Type", value: type, inline: true },
//         { name: "Rep", value: `${rep}`, inline: true },
//         { name: "Joined", value: `<t:${Math.floor(joinedAt.getTime()/1000)}:R>` },
//         { name: "Application ID", value: `${app._id}` }
//       );

//     const row = new ActionRowBuilder().addComponents(
//       new ButtonBuilder().setCustomId(`cert_approve:${app._id}`).setLabel("Approve").setStyle(ButtonStyle.Success),
//       new ButtonBuilder().setCustomId(`cert_reject:${app._id}`).setLabel("Reject").setStyle(ButtonStyle.Danger)
//     );

//     await reviewChannel.send({ embeds: [embed], components: [row] });

//     await interaction.editReply({ content: `✅ Your **${type}** application has been submitted.` });
//   });

//   // -------------------------------------------------------------
//   // APPROVE / REJECT
//   // -------------------------------------------------------------
//   client.on(Events.InteractionCreate, async (interaction) => {
//     if (!interaction.isButton()) return;

//     const { customId } = interaction;
//     if (!customId.startsWith("cert_approve:") && !customId.startsWith("cert_reject:")) return;

//     // check admin
//     if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
//       return interaction.reply({ content: "❌ Admins only.", ephemeral: true });
//     }

//     const [action, appId] = customId.split(":");
//     const app = await Certificate.findById(appId);
//     if (!app) return interaction.reply({ content: "❌ Application not found.", ephemeral: true });

//     // ---------------------------------------------------------
//     // APPROVE
//     // ---------------------------------------------------------
//     if (action === "cert_approve") {
//       if (app.status !== "pending") {
//         return interaction.reply({ content: "⚠️ Already processed.", ephemeral: true });
//       }

//       await interaction.deferReply({ ephemeral: true });

//       app.status = "approved";
//       app.moderatorId = interaction.user.id;
//       app.resolvedAt = new Date();
//       await app.save();

//       // Send DM with DETAILS button
//       try {
//         const user = await client.users.fetch(app.userId);
//         await user.send({
//           embeds: [
//             new EmbedBuilder()
//               .setTitle("✅ Application Approved")
//               .setDescription(
//                 `Your application for **${app.type}** has been approved.\n\n` +
//                 "Please submit your **legal name** and **email**.\n" +
//                 "**Click the button below.**"
//               )
//               .setColor("#00C851")
//           ],
//           components: [
//             new ActionRowBuilder().addComponents(
//               new ButtonBuilder()
//                 .setCustomId(`cert_details:${app._id}`)
//                 .setLabel("Submit Details")
//                 .setStyle(ButtonStyle.Primary)
//             )
//           ]
//         });
//       } catch {}

//       return interaction.editReply({ content: "✅ Approved. User notified." });
//     }

//     // ---------------------------------------------------------
//     // REJECT
//     // ---------------------------------------------------------
//     if (action === "cert_reject") {
//       if (!interaction.replied && !interaction.deferred)
//         await interaction.deferReply({ ephemeral: true });

//       app.status = "rejected";
//       app.moderatorId = interaction.user.id;
//       app.resolvedAt = new Date();
//       app.reason = "Rejected by admin";
//       await app.save();

//       return interaction.editReply({ content: "❌ Application rejected." });
//     }
//   });

//   // -------------------------------------------------------------
//   // DETAILS BUTTON → OPEN MODAL
//   // -------------------------------------------------------------
//   client.on(Events.InteractionCreate, async (interaction) => {
//     if (!interaction.isButton()) return;
//     if (!interaction.customId.startsWith("cert_details:")) return;

//     const appId = interaction.customId.split(":")[1];
//     const app = await Certificate.findById(appId);
//     if (!app) {
//       return interaction.reply({ ephemeral: true, content: "❌ Application not found." });
//     }

//     if (app.status !== "approved") {
//       return interaction.reply({ ephemeral: true, content: "❌ You cannot submit details for this." });
//     }

//     if (app.detailsSubmitted) {
//       return interaction.reply({
//         ephemeral: true,
//         content:
//           "⚠️ You have **already submitted** certificate details.\n" +
//           "If something is wrong, email: **r.alevelserver@gmail.com**"
//       });
//     }

//     // SHOW MODAL (NO deferReply before this)
//     const modal = new ModalBuilder()
//       .setCustomId(`cert_details_modal:${appId}`)
//       .setTitle("Submit Certificate Details");

//     const nameInput = new TextInputBuilder()
//       .setCustomId("legal_name")
//       .setLabel("Full Legal Name")
//       .setRequired(true)
//       .setStyle(TextInputStyle.Short);

//     const emailInput = new TextInputBuilder()
//       .setCustomId("email")
//       .setLabel("Email Address")
//       .setRequired(true)
//       .setStyle(TextInputStyle.Short);

//     modal.addComponents(
//       new ActionRowBuilder().addComponents(nameInput),
//       new ActionRowBuilder().addComponents(emailInput)
//     );

//     return interaction.showModal(modal);
//   });

//   // -------------------------------------------------------------
//   // DETAILS MODAL SUBMISSION
//   // -------------------------------------------------------------
//   client.on(Events.InteractionCreate, async (interaction) => {
//     if (interaction.type !== InteractionType.ModalSubmit) return;
//     if (!interaction.customId.startsWith("cert_details_modal:")) return;

//     const appId = interaction.customId.split(":")[1];
//     const app = await Certificate.findById(appId);
//     if (!app) {
//       return interaction.reply({ ephemeral: true, content: "❌ Application not found." });
//     }

//     if (app.detailsSubmitted) {
//       return interaction.reply({
//         ephemeral: true,
//         content:
//           "⚠️ You already submitted details.\nIf wrong, email **r.alevelserver@gmail.com**."
//       });
//     }

//     const legalName = interaction.fields.getTextInputValue("legal_name");
//     const email = interaction.fields.getTextInputValue("email");

//     app.detailsSubmitted = true;
//     app.legalName = legalName;
//     app.email = email;
//     await app.save();

//     const reviewChannel = await client.channels.fetch(REVIEW_CHANNEL);
//     await reviewChannel.send(
//       `📥 **Details Submitted** for application **${app._id}**\n` +
//       `👤 **${app.userTag}**\n` +
//       `• Name: **${legalName}**\n` +
//       `• Email: **${email}**`
//     );

//     return interaction.reply({
//       ephemeral: true,
//       content: "✅ Details submitted successfully. We will prepare your certificate."
//     });
//   });
// };

// systems/certificates.js
const {
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
  ComponentType
} = require("discord.js");

const Certificate = require("../models/certificate.js");
const Reputation = require("../models/reputation.js");
require("dotenv").config();


// CONFIG — change IDs if needed
const APPLICATION_CHANNEL = process.env.APPLICATION_CHANNEL;
const REVIEW_CHANNEL = process.env.REVIEW_CHANNEL;
const ROLE_SR_HELPER = process.env.ROLE_SR_HELPER;           // senior helper role (eligibility)
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;           // only this role can approve/reject / use submit command
const RESOURCE_CONTRIBUTOR_ROLE = process.env.RESOURCE_CONTRIBUTOR_ROLE; // optional role to give on resource approval
const CERT_UPDATES_CHANNEL = process.env.CERT_UPDATES_CHANNEL; // Public certificate updates channel


module.exports = function certificateSystem(client) {
  // Utility: get rep count
  async function getRepCount(userId) {
    try {
      const doc = await Reputation.findOne({ userId });
      return doc?.rep ?? 0;
    } catch {
      return 0;
    }
  }

//   // Fancy Embed Panel in Application Channel
//   client.once(Events.ClientReady, async () => {
//     try {
//       const channel = await client.channels.fetch(APPLICATION_CHANNEL);
//       if (!channel) return console.error("❌ Application channel missing");

//       const embed = new EmbedBuilder()
//   .setTitle("🧾 Certificate Application")
//   .setDescription(
//     "**__How to Apply:__**\n" +
//     "Click on the relevant application button below.\n\n" +

//     "**__Eligibility & Availability:__**\n" +
//     "**Helper Certification**\n" +
//     "• Maintain your Helper position for a minimum of 1 month, reach 100 Reputation, and achieve the rank of <@&1437727634711777450>.\n\n" +

//     "**Writer Certification**\n" +
//     "• Submit a minimum of 5 extensive and helpful blogs/pieces-of-writing to our website.\n\n" +

//     "**Resource Contributor Certification**\n" +
//     "• Submit a minimum of 5 informative documents or notes relevant to a subject(s).\n\n" +

//     "**Graphic Designer Certification**\n" +
//     "• Submit a minimum of 5 pieces of graphic design (must have been utilized) as a <@&1431092954100928583>.\n\n" +

//     "**Moderator Certification**\n" +
//     "• Achieve the rank of <@&1114447390724849725>.\n"  +
//     "• Eligible Moderators can directly ping <@&1114451108811767928> to apply\n\n" +

//     "Please ensure you meet the requirements before applying.\n" + 
    
//     "If your DMs are closed, you'll receive updates in <#1444615091780583526> channel"
//   )
//   .setColor("#2CDAF2")
//   .setFooter({ text: "Only one pending application per certificate is permitted. " })
//   .setTimestamp();

//      const row = new ActionRowBuilder().addComponents(
//   new ButtonBuilder().setCustomId("apply_helper").setLabel("Apply — Helper").setStyle(ButtonStyle.Primary),  // blurple
//   new ButtonBuilder().setCustomId("apply_writer").setLabel("Apply — Writer").setStyle(ButtonStyle.Primary), // gray
//   new ButtonBuilder().setCustomId("apply_resource").setLabel("Apply — Resource").setStyle(ButtonStyle.Primary),  // red (stands out for resources)
//   new ButtonBuilder().setCustomId("apply_graphic").setLabel("Apply — Graphic").setStyle(ButtonStyle.Primary),   // green
// );

//       await channel.send({ embeds: [embed], components: [row] });
//       console.log("✅ Certificate application panel sent.");
//     } catch (err) {
//       console.error("❌ Panel send error:", err);
//     }
//   });
  

  // Single InteractionCreate handler for all certificate interactions (keeps things tidy)
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      // ---------------------------
      // Modal submit flows (reject modal)
      // ---------------------------
      if (interaction.type === InteractionType.ModalSubmit) {
        const customId = interaction.customId || "";
        // Reject modal: cert_reject_modal:<appId>
        if (customId.startsWith("cert_reject_modal:")) {
          const appId = customId.split(":")[1];
          if (!appId) return;

          // Only admins should be able (we'll double-check interaction.member roles)
          const member = interaction.member;
          if (!member || !member.roles.cache.has(ADMIN_ROLE_ID)) {
            return interaction.reply({ ephemeral: true, content: "❌ Only admins may reject applications." });
          }

          // Fetch app
          const app = await Certificate.findById(appId);
          if (!app) {
            return interaction.reply({ ephemeral: true, content: "❌ Application not found." });
          }

          // Collect reason
          const reason = interaction.fields.getTextInputValue("reject_reason") || "No reason provided";

          // Update DB
          if (app.status !== "pending") {
            return interaction.reply({ ephemeral: true, content: "⚠️ This application was already processed." });
          }

          app.status = "rejected";
          app.reason = reason;
          app.moderatorId = interaction.user.id;
          app.resolvedAt = new Date();
          await app.save();
          await interaction.deferReply({ ephemeral: true });

          // DM applicant (best-effort)
          try {
            const user = await client.users.fetch(app.userId).catch(() => null);
            if (user) {
              await user.send({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("❌ Certificate Application — Rejected")
                    .setDescription(`Your application for **${app.type}** certificate was rejected.`)
                    .addFields(
                      { name: "Reason", value: reason.slice(0, 1024) },
                      { name: "Application ID", value: `\`${app._id}\``, inline: true }
                    )
                    .setColor("#ff4d4d")
                    .setTimestamp()
                ]
              }).catch(() => {});
            }
          } catch {
            // Send update 
          try {
            const updatesCh = await client.channels.fetch(CERT_UPDATES_CHANNEL);
            const applicantUser = await client.users.fetch(app.userId);

            const updateEmbed = new EmbedBuilder()
              .setTitle("❌ Certificate Application — Rejected")
              .setDescription(`Your application for **${app.type}** certificate was rejected.`)
              .addFields(
                { name: "Reason", value: reason.slice(0, 1024) },
                { name: "Application ID", value: `\`${app._id}\``, inline: true }
              )
              .setColor("#ff4d4d")
              .setFooter({ text: "You're seeing updates here because your DMs are closed or restricted." })
              .setTimestamp();

            await updatesCh.send({
              content: `<@${applicantUser.id}>`, // 👈 ping the user
              embeds: [updateEmbed]
            });

          } catch (err) {
            console.error(err);
          }
          }

        
           // Post to review channel
          await interaction.editReply({ content: `✅ Rejected` }); 

          try {
            const reviewCh = await client.channels.fetch(REVIEW_CHANNEL).catch(() => null);
            if (reviewCh) {
              const embed = new EmbedBuilder()
              .setTitle("✅ Certificate Application Rejected")
              .setDescription(
                `Application ID: \`${app._id}\`\n
                 Moderator: ${interaction.user.tag} \n
                 Reason: ${reason}
                `
              ).setColor("#ff4d4d")
              .setTimestamp()
              await reviewCh.send({
              embeds: [embed]
            });
            }
          } catch (err) {console.log(err)}
          

          return;
        }

        // Details modal by user is NOT used in this version (we use /submit-cert-details or email workflow)
        return;
      }

      // For buttons and other interaction types:
      if (!interaction.isButton()) return;

      const customId = interaction.customId;
      const user = interaction.user;
      const guild = interaction.guild;
      const channel = interaction.channel;

      // ---------------------------
      // APPLY buttons
      // ---------------------------
      if (customId === "apply_helper" || customId === "apply_writer" || customId === "apply_resource" || customId === "apply_graphic" ) {
        // We will defer reply (ephemeral) because we do DB work
        await interaction.deferReply({ ephemeral: true });

        // Type map
        const type = customId === "apply_helper" ? "Helper"
          : customId === "apply_writer" ? "Writer"
          : customId === "apply_graphic" ? "Graphic Designer"
          : "Resource Contributor";

        // If in guild, fetch member for role checks
        let member = null;
        if (guild) member = await guild.members.fetch(user.id).catch(() => null);

        // Eligibility: Helper requires senior helper
        if (type === "Helper") {
          if (!member || !member.roles.cache.has(ROLE_SR_HELPER)) {
            return interaction.editReply({
              content:
                "❌ You are not eligible for the Helper Certificate. Only Senior Helpers may apply.\n" +
                "You need 100 Reputation points and 1 month of activity to become Senior Helper\n" +
                "If you think this is an error, contact staff by opening a ticket."
            });
          }
        }

        // Disallow duplicate pending application of same type
        const already = await Certificate.findOne({ userId: user.id, type, status: "pending" });
        if (already) {
          return interaction.editReply({ content: `⚠️ You already have a pending ${type} application (ID: \`${already._id}\`).` });
        }

        // gather info
        const rep = await getRepCount(user.id);
        const joinedAt = member?.joinedAt ?? null;

        // create application
        const app = await Certificate.create({
          userId: user.id,
          userTag: user.tag,
          type,
          rep,
          joinedAt,
          status: "pending",
          createdAt: new Date()
        });

        // prepare review embed
        const appEmbed = new EmbedBuilder()
          .setTitle("📨 New Certificate Application")
          .setColor("#5865F2")
          .addFields(
            { name: "Applicant", value: `${user.tag} (${user.id})`, inline: true },
            { name: "Type", value: `${type}`, inline: true },
            { name: "Rep", value: `${rep}`, inline: true },
            { name: "Joined", value: joinedAt ? `<t:${Math.floor(joinedAt.getTime()/1000)}:R>` : "Unknown", inline: true },
            { name: "Submitted", value: `<t:${Math.floor(app.createdAt.getTime()/1000)}:F>`, inline: true },
            { name: "Application ID", value: `\`${app._id}\``, inline: false }
          )
          .setFooter({ text: channel ? `Submitted in #${channel.name}` : "Submitted (unknown channel)" });

        const approveId = `cert_approve:${app._id}`;
        const rejectId = `cert_reject:${app._id}`;

        const reviewRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(approveId).setLabel("Approve").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(rejectId).setLabel("Reject").setStyle(ButtonStyle.Danger)
        );

        // send to review channel
        const reviewCh = await client.channels.fetch(REVIEW_CHANNEL).catch(() => null);
        if (reviewCh) {
          await reviewCh.send({ embeds: [appEmbed], components: [reviewRow] }).catch(() => {
            // swallow
          });
        }

        // DM applicant (best-effort)
        try {
          const u = await client.users.fetch(user.id);
          if (u) {
            await u.send({
              embeds: [
                new EmbedBuilder()
                  .setTitle("✅ Application Submitted")
                  .setDescription(`Your application for **${type}** certificate was submitted and queued for review.`)
                  .addFields(
                    { name: "Application ID", value: `\`${app._id}\``, inline: false },
                    { name: "Rep", value: `${rep}`, inline: true },
                    { name: "Joined", value: joinedAt ? `<t:${Math.floor(joinedAt.getTime()/1000)}:R>` : "Unknown", inline: true }
                  )
                  .setColor("#00B894")
              ]
            }).catch(() => {});
          }
        } catch {
            // Send update 
            try {
              const updatesCh = await client.channels.fetch(CERT_UPDATES_CHANNEL);
              const applicantUser = await client.users.fetch(user.id);

              const updateEmbed = new EmbedBuilder()
                    .setTitle("✅ Application Submitted")
                    .setDescription(`Your application for **${type}** certificate was submitted and queued for review.`)
                    .addFields(
                      { name: "Application ID", value: ` \`${app._id}\``, inline: false },
                      { name: "Rep", value: `${rep}`, inline: true },
                      { name: "Joined", value: joinedAt ? `<t:${Math.floor(joinedAt.getTime()/1000)}:R>` : "Unknown", inline: true }
                    )
                    .setColor("#00B894")
                .setFooter({ text: "You're seeing updates here because your DMs are closed or restricted." })
                .setTimestamp();

              await updatesCh.send({
                content: `<@${applicantUser.id}>`, // 👈 ping the user
                embeds: [updateEmbed]
              });
            } catch (err) {
              console.error(err);
            }
        }
   
          
        return interaction.editReply({ content: `✅ Your ${type} application has been submitted (ID: \`${app._id})\`.` });
        
      }

 

      // ---------------------------
      // Approve / Reject buttons (admin-only)
      // Custom IDs:
      //   cert_approve:<appId>
      //   cert_reject:<appId>
      // ---------------------------
      if (customId.startsWith("cert_approve:") || customId.startsWith("cert_reject:")) {
        // Admin check
        const member = interaction.member;
        if (!member || !member.roles.cache.has(ADMIN_ROLE_ID)) {
          return interaction.reply({ ephemeral: true, content: "❌ Only admins may perform this action." });
        }

        const [action, appId] = customId.split(":");
        const app = await Certificate.findById(appId);
        if (!app) {
          return interaction.reply({ ephemeral: true, content: "❌ Application not found." });
        }

        // APPROVE
        if (action === "cert_approve") {
          if (app.status !== "pending") {
            return interaction.reply({ ephemeral: true, content: "⚠️ This application has already been processed." });
          }

          // defer ephemeral reply while we update DB and DM the user
          await interaction.deferReply({ ephemeral: true });

          // Update DB
          app.status = "approved";
          app.moderatorId = interaction.user.id;
          app.resolvedAt = new Date();
          await app.save();

          // If resource contributor type, try to give role in guild (best-effort)
          try {
            if (interaction.guild && app.type.toLowerCase().includes("resource")) {
              const guildMember = await interaction.guild.members.fetch(app.userId).catch(() => null);
              if (guildMember) await guildMember.roles.add(RESOURCE_CONTRIBUTOR_ROLE).catch(() => {});
            }
          } catch (err) {
            // ignore
          }

          // DM applicant: tell them to email or ask mods to use /submit-cert-details
          try {
            const u = await client.users.fetch(app.userId).catch(() => null);
            if (u) {
              await u.send({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("✅ Certificate Application Approved")
                    .setDescription(
                      `Your application for **${app.type}** certificate has been approved by our Administrative team. 🎉\n\n` +
                      `**Next step:** Please send your **legal full name** and **email** to **r.alevelserver@gmail.com**.\n\n` +
                      `Your **legal full name** will be used in the certificate and cannot be changed later.\n\n` +

                      `Application ID:  \`${app._id}\`\n\n` +
                      `⚠️ **Note:** \n\n` +
                      `When you send details via email, please mention your Application ID in the email.\n\n` +
                      `Your full legal name will remain confidental.\n\n` +
                      `Please send us the details from the email on which you'd like to receive the certificate.\n` 
                    )
                    .setColor("#00B894")
                    .setTimestamp()
                ]
              }).catch(() => {});
            }
          } catch (err) {
            console.log(err)
                // Send update 
          try {
            const updatesCh = await client.channels.fetch(CERT_UPDATES_CHANNEL);
            const applicantUser = await client.users.fetch(app.userId);

            const updateEmbed = new EmbedBuilder()
                    .setTitle("✅ Certificate Application Approved")
                    .setDescription(
                      `Your application for **${app.type}** certificate has been approved by our Administrative team. 🎉\n\n` +
                      `**Next step:** Please send your **legal full name** and **email** to **r.alevelserver@gmail.com**.\n\n` +
                      `Your **legal full name** will be used in the certificate and cannot be changed later.\n\n` +

                      `Application ID:  \`${app._id}\`\n\n` +
                      `⚠️ **Note:** \n\n` +
                      `When you send details via email, please mention your Application ID in the email.\n\n` +
                      `Your full legal name will remain confidental.\n\n` +
                      `Please send us the details from the email on which you'd like to receive the certificate.\n` 
                    )
                    .setColor("#00B894")
              .setFooter({ text: "You're seeing updates here because your DMs are closed or restricted." })
              .setTimestamp();

            await updatesCh.send({
              content: `<@${applicantUser.id}>`, // 👈 ping the user
              embeds: [updateEmbed]
            });
          } catch (err) {
            console.error(err);
          }
          }

          

          

          // Post to review channel
          try {
            const reviewCh = await client.channels.fetch(REVIEW_CHANNEL).catch(() => null);
            if (reviewCh) {
              const embed = new EmbedBuilder()
              .setTitle("✅ Certificate Application Approved")
              .setDescription(
                `Application ID: \`${app._id}\`\n
                 Moderator: ${interaction.user.tag}
                `
              ).setColor("#00B894")
              .setTimestamp()
              await reviewCh.send({
              embeds: [embed]
            });
            }
          } catch (err) {console.log(err)}
          
          await interaction.editReply({ content: `✅ Approved` });    
          return;
        }

        // REJECT → show modal (do NOT defer before showModal)
        if (action === "cert_reject") {
          if (app.status !== "pending") {
            return interaction.reply({ ephemeral: true, content: "⚠️ This application has already been processed." });
          }

          // Build and show modal for rejection reason
          const modal = new ModalBuilder()
            .setCustomId(`cert_reject_modal:${appId}`)
            .setTitle("Reject Certificate Application");

          const reasonInput = new TextInputBuilder()
            .setCustomId("reject_reason")
            .setLabel("Rejection Reason")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("Explain briefly why this application is rejected")
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(1000);

          modal.addComponents(
            new ActionRowBuilder().addComponents(reasonInput)
          );

          // show modal (no defer before)
          return interaction.showModal(modal);
        }
      }


      return;
    } catch (err) {
      console.error("[certificates] Interaction handler error:", err);
      // Best-effort safe reply
      try {
        if (interaction && !interaction.replied && !interaction.deferred) {
          await interaction.reply({ ephemeral: true, content: "⚠️ An error occurred while processing this interaction." });
        } else if (interaction && interaction.deferred) {
          await interaction.editReply({ content: "⚠️ An error occurred while processing this interaction." });
        }
      } catch {}
    }
  });

}