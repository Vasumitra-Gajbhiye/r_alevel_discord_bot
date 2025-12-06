// // commands/delivered-certificate.js
// const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
// const Certificate = require("../../models/certificate.js");

// module.exports = {
//   data: new SlashCommandBuilder()
//     .setName("mark-cert-delivered")
//     .setDescription("Mark certificate as delivered (admin/mod only)")
//     .addStringOption(opt => opt
//       .setName("applicationid")
//       .setDescription("Application ID to mark delivered")
//       .setRequired(true)).addStringOption(opt => opt.setName("Certificate link").setDescription("Link to applicants certificate").setRequired(true)).addAttachmentOption(opt => opt.setName("pdf").setDescription("Attach the final certificate PDF").setRequired(true))
//     .setDefaultMemberPermissions(0),

//   async execute(interaction) {
//     const ADMIN = "1114451108811767928";
//     if (!interaction.member.roles.cache.has(ADMIN)) {
//       return interaction.reply({ content: "❌ Only moderators/admins can use this.", flags: 64 });
//     }

//     const id = interaction.options.getString("applicationid");
//     const app = await Certificate.findById(id).catch(() => null);

//     if (!app) {
//       return interaction.reply({ content: "❌ Application ID does not exist.", flags: 64 });
//     }

//     if (app.status === "delivered") {
//       return interaction.reply({ content: "⚠️ Already marked delivered.", flags: 64 });
//     }

//     app.status = "delivered";
//     app.resolvedAt = new Date();
//     await app.save();

//     try {
//       const u = await interaction.client.users.fetch(app.userId);
//       if (u) {
//         await u.send({
//           embeds:[ new EmbedBuilder()
//             .setTitle("📬 Certificate Delivered!")
//             .setColor("#00B894")
//             .setDescription(`🎉 Your **${app.type}** certificate has been **delivered** by our team!`)
//             .addFields(
//               { name: "Name on Certificate", value: app.legalName || "Not provided", inline: true },
//               { name: "Delivery Email", value: app.email || "Not provided", inline: false }
//             )
//             .setFooter({ text: "Thank you for contributing to r/alevel!" })
//             .setTimestamp()
//           ]
//         }).catch(()=>{});
//       }
//     } catch {}

//     const embed = new EmbedBuilder()
//       .setTitle("✅ Certificate Delivery Updated")
//       .setColor("#00C851")
//       .setDescription(`Application **${app._id}** has been updated to **DELIVERED 📬**.`)
//       .addFields(
//         { name: "User", value: `${app.userTag}`, inline:true },
//         { name: "Type", value: `${app.type}`, inline:true },
//         { name: "Delivered Details?", value: app.legalName && app.email ? "Yes ✅" : "No ⚠️", inline:false }
//       )
//       .setFooter({ text: "Delivery logged in database." })
//       .setTimestamp();

//     await interaction.client.channels.fetch("1442441607671451648").then(ch => {
//       if (ch) ch.send({ embeds:[embed] });
//     }).catch(()=>{});

//     return interaction.reply({ content: `✅ Application ${app._id} marked delivered + logged.`, flags: 64 });
//   }
// };

// commands/mark-cert-delivered.js
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const Certificate = require("../../models/certificate.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mark-cert-delivered")
    .setDescription("Mark a certificate as delivered (Mods/Admin only)")
    .addStringOption(opt => opt
      .setName("applicationid")
      .setDescription("Application ID to mark delivered")
      .setRequired(true))
    .addStringOption(opt => opt
      .setName("certificate_link")
      .setDescription("Link to applicant's certificate")
      .setRequired(true))
    .addStringOption(opt => opt
      .setName("certificate_id")
      .setDescription("Applicant's certificate ID")
      .setRequired(true))
    .addAttachmentOption(opt => opt
      .setName("pdf")
      .setDescription("Attach the final certificate PDF")
      .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers), // we handle permissions manually via role check

  async execute(interaction) {
    const MOD_ROLES = process.env.MOD_ROLES?.split(",") || [];
    const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;
const REVIEW_CHANNEL =process.env.REVIEW_CHANNEL;
const CERT_UPDATES_CHANNEL = process.env.REVIEW_CHANNEL; // Public certificate updates channel


    const member = interaction.member;
    const isMod = member.roles.cache.some(r => MOD_ROLES.includes(r.id)) ||
                  member.roles.cache.has(ADMIN_ROLE_ID);

    if (!isMod) {
      return interaction.reply({ content: "❌ Only Mods/Admins may use this command.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    const applicationId = interaction.options.getString("applicationid");
    const certLink = interaction.options.getString("certificate_link");
    const certId = interaction.options.getString("certificate_id");
    const pdf = interaction.options.getAttachment("pdf");

    try {
      const app = await Certificate.findById(applicationId);
      if (!app) {
        return interaction.editReply({ content: "❌ Application not found in database." });
      }

      if (app.status !== "details_submitted") {
        return interaction.editReply({ content: "⚠️ Certificate must have details submitted before delivery." });
      }

      // ✅ FIX: use valid enum
      app.status = "completed and delivered"; 
      app.certId = certId; 
      app.certLink = certLink;
      app.deliveredAt = new Date();   // timestamp when delivered
      await app.save();

      // DM the user the PDF
      try {
        const applicant = await interaction.client.users.fetch(app.userId);
        await applicant.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("📬 Certificate Delivered!")
              .setDescription(`🎉 Your **${app.type}** certificate has been **delivered** by our team!`)
              .setColor("#00B894")
              .addFields(
                { name: "Name on Certificate", value: app.legalName, inline: false },
                { name: "Delivery Email", value: app.email, inline: false },
                { name: "Download", value: pdf.url, inline: false },
                { name: "Certificate Link", value: certLink, inline: false },
                { name: "Certificate ID", value: certId, inline: false }
              )
              .setTimestamp()
          ]
        });
      } catch {
         // Send update 
          try {
            const updatesCh = await interaction.client.channels.fetch(CERT_UPDATES_CHANNEL);
            const applicantUser = await interaction.client.users.fetch(app.userId);

            const updateEmbed = new EmbedBuilder()
              .setTitle("📬 Certificate Delivered!")
              .setDescription(`🎉 Your **${app.type}** certificate has been **delivered** by our team to you submited email address!`)
              .setColor("#00B894")
              .addFields(
                { name: "Find any error or need help?", value: "Open a ticket here: <#1325384293970870292>", inline: false },
                { name: "Name on Certificate", value: "Hidden for confidentiality", inline: false },
                { name: "Delivery Email", value: "Hidden for confidentiality", inline: false },
                { name: "Certificate Link", value: "Hidden for confidentiality", inline: false },
                { name: "Certificate ID", value: "Hidden for confidentiality", inline: false }
              )
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

      

      // Log in review channel as an embed instead of plain text
      try {
        const reviewCh = await interaction.client.channels.fetch(REVIEW_CHANNEL);
        await reviewCh.send({
          embeds: [
            new EmbedBuilder()
              .setTitle("📬 Certificate Marked Delivered")
              .setColor("#2ECC71")
              .setDescription(`✅ Certificate marked **delivered** by ${interaction.user.tag}`)
              .addFields(
                { name: "User", value: `${app.userTag} (${app.userId})`, inline: false },
                { name: "Application ID", value: `\`${app._id}\``, inline: false },
                { name: "Legal Name", value: app.legalName || "Not Recorded", inline: true },
                { name: "Email", value: app.email || "Not Recorded", inline: true },
                { name: "Certificate Link", value: certLink, inline: false },
                { name: "Certificate ID", value: certId, inline: false },
                { name: "PDF", value: pdf.url, inline: false },
                { name: "Delivered", value: `<t:${Math.floor(app.deliveredAt.getTime()/1000)}:R>`, inline: false }
              )
              .setTimestamp()
          ]
        });
      } catch {}

      return interaction.editReply({ content: "✅ Certificate marked delivered and user notified via DM!" });

    } catch (err) {
      console.error("❌ Database error:", err);
      return interaction.editReply({ content: "⚠️ Unexpected error. Check console logs." });
    }
  }
};