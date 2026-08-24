const { ModmailMessageLink } = require("@ralevel/db");
const modmail = require("../systems/modmail");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function testReferencedMessageId() {
  assert(
    modmail.referencedMessageId({ reference: { messageId: "abc" } }) === "abc",
    "should read discord.js messageId"
  );
  assert(
    modmail.referencedMessageId({ reference: { message_id: "def" } }) === "def",
    "should read raw message_id"
  );
  assert(
    modmail.referencedMessageId({ reference: {} }) === null,
    "empty reference should be null"
  );
  assert(
    modmail.referencedMessageId({}) === null,
    "missing reference should be null"
  );
}

function testCounterpartLookup() {
  const link = { dmMessageId: "dm-1", threadMessageId: "th-1" };

  assert(
    modmail.counterpartMessageId(link, "dm") === "th-1",
    "DM side should map to thread message"
  );
  assert(
    modmail.counterpartMessageId(link, "thread") === "dm-1",
    "thread side should map to DM message"
  );
  assert(
    modmail.counterpartMessageId(null, "dm") === null,
    "missing link should fall back to no reply"
  );
  assert(
    modmail.counterpartMessageId({}, "thread") === null,
    "empty link should fall back to no reply"
  );
}

function testReplyOptions() {
  assert(
    Object.keys(modmail.buildRelayReplyOptions(null)).length === 0,
    "no mapping should send a plain relay"
  );
  assert(
    Object.keys(modmail.buildRelayReplyOptions("")).length === 0,
    "empty id should send a plain relay"
  );

  const options = modmail.buildRelayReplyOptions("msg-9");
  assert(
    options.reply?.messageReference === "msg-9",
    "should set messageReference to the counterpart"
  );
  assert(
    options.reply?.failIfNotExists === false,
    "deleted counterpart should still deliver"
  );
  assert(
    options.allowedMentions?.repliedUser === false,
    "native replies must not ping"
  );
}

async function testResolveReplyMessageId() {
  const originalFindOne = ModmailMessageLink.findOne;
  const links = [{ dmMessageId: "dm-1", threadMessageId: "th-1" }];

  ModmailMessageLink.findOne = (query) => ({
    lean: async () =>
      links.find((link) =>
        query.dmMessageId
          ? link.dmMessageId === query.dmMessageId
          : link.threadMessageId === query.threadMessageId
      ) || null,
  });

  try {
    assert(
      (await modmail.resolveReplyMessageId("dm-1", "dm")) === "th-1",
      "user reply in DM should target the thread counterpart"
    );
    assert(
      (await modmail.resolveReplyMessageId("th-1", "thread")) === "dm-1",
      "staff reply in thread should target the DM counterpart"
    );
    assert(
      (await modmail.resolveReplyMessageId("unknown", "dm")) === null,
      "unknown reference should fall back to no mapping"
    );
    assert(
      (await modmail.resolveReplyMessageId(null, "thread")) === null,
      "plain message should not look up a counterpart"
    );
  } finally {
    ModmailMessageLink.findOne = originalFindOne;
  }
}

async function main() {
  testReferencedMessageId();
  testCounterpartLookup();
  testReplyOptions();
  await testResolveReplyMessageId();
  console.log("verify-modmail-replies: all checks passed");
}

main().catch((err) => {
  console.error("verify-modmail-replies failed:", err.message);
  process.exit(1);
});
