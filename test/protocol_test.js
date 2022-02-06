const CBSC = artifacts.require("CBSC");

contract("CBSC Simulation", async (accounts) => {
  require("dotenv").config();
  const fs = require("fs");
  const sb = require("@supabase/supabase-js");
  const formatXml = require("xml-formatter");
  const xmlParser = require("xml2json");
  const supabase = sb.createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  let x = accounts[1];
  let y = accounts[2];
  let xz = accounts[3];
  let yz = accounts[4];
  let buyer = x; //xz
  let seller = y; //yz

  /*
   * Instance to connect to smart contract via Ganache-CLI
   * */
  let instance;
  let hash;
  let balance;
  let state;

  async function queryEventData() {
    let { data: events, error } = await supabase.from("events").select("id");
    return events;
  }

  async function getActionCounter() {
    let { data: actions, error } = await supabase.from("actions").select(`
                    id
                `);
    return actions[0].id;
  }

  async function queryActionData(_action_counter) {
    let { data: action, error } = await supabase
      .from("actions")
      .select(
        `
                    fulfillment_value,
                    message,
                    transition,
                    operation,
                    events (
                        id, title
                    ),
                    commitments (
                        id, title, state, debtor, creditor, fluents (
                        id, title, atomic, balance, max_terms, terms_left, original_balance, start, end
                    )
                    )
                `
      )
      .eq("id", _action_counter);
    return action[0];
  }

  async function insertPartialFulfillment(
    _id,
    _event_id,
    _iteration,
    _fluent_id,
    _attempt,
    _action,
    _origin,
    _faction
  ) {
    let { data, error } = await supabase.from("iterations").insert([
      {
        id: _id,
        event_id: _event_id,
        iteration: _iteration,
        fluent_id: _fluent_id,
        attempt: _attempt,
        action: _action,
        origin: _origin,
      },
    ]);
    return data;
  }

  async function insertHash(_action_id, _hash) {
    const { data, error } = await supabase
      .from("actions")
      .update([
        {
          hash: _hash,
          hash_timestamp: Math.floor(Date.now() / 1000),
        },
      ])
      .eq("id", _action_id);
    console.log(data);
    console.log(error);
    return;
  }

  async function writeRuleMLOutput(time, json) {
    /*
     * Write transaction hash back protocol run and store it in bc-output.xml
     * */
    fs.writeFile(
      "test/commitruleml/run/run-" + time + ".commitruleml",
      formatXml(xmlParser.toXml(json), {
        collapseContent: false,
      }),
      function (err, result) {
        if (err) {
          console.log("Unable to write RuleML file");
        } else {
          console.log();
          console.log(
            "  RuleML template file run-" + time + ".ruleml generated"
          );
          console.log();
        }
      }
    );
  }

  before("Preparing CBSC", async () => {
    instance = await CBSC.deployed();

    /*
     * Setup roles for test, defaults to x & y
     * Optional functions to delegate or assign
     */
    await instance.setupRoles(buyer, seller);
    //await instance.grantbuyerRole(xz);
    //await instance.grantsellerRole(xy);

    instance.StateLog({}, async (error, result) => {
      if (error) {
        console.log(error);
      }
      if (result) {
        hash = result.transactionHash;
        state = result.args.state;
      }
    });

    instance.PartialSatisfactionLog({}, async (error, result) => {
      if (error) {
        console.log(error);
      }
      if (result) {
        balance = result.args.balance.words[0];
        console.log(balance);
      }
    });
  });

  it("CBSC Protocol Run", async () => {
    let _event_counter = 1;
    let _db_action_counter = await getActionCounter();
    let _code_action_counter = 1;
    let _iteration = 0;

    let _events = await queryEventData();

    while (_event_counter <= _events.length) {
      // step 0: delete all existing commitruleml files
      fs.readdir("test/commitruleml/run/", (err, files) => {
        if (err) console.log(err);
        for (const file of files) {
          fs.unlinkSync("test/commitruleml/run/" + file);
        }
      });

      // step 1: read the actions from the CBSC app
      let _action = await queryActionData(_db_action_counter);

      // step 2: write the actions to commitml files
      let ruleMLTemplate = fs.readFileSync(
        "test/commitruleml/template/template.commitruleml",
        "utf8"
      );
      templateJson = xmlParser.toJson(ruleMLTemplate, {
        reversible: true,
        object: true,
      });

      //on template attributes matching
      templateJson.Rule.Assert.on.Happens.Event.id = _action.events.id;
      templateJson.Rule.Assert.on.Happens.Event.id = _action.events.title;
      //templateJson.Rule.Assert.on.Happens.Event.slot.title = ;
      //templateJson.Rule.Assert.on.Happens.Event.slot.ind.value = ;
      templateJson.Rule.Assert.on.Happens.Time.event = _event_counter;
      templateJson.Rule.Assert.on.Happens.Time.event = _code_action_counter;
      templateJson.Rule.Assert.on.Happens.Time.event = _iteration;

      let start = _action.commitments.fluents[0].start.split(".");
      let end = _action.commitments.fluents[0].end.split(".");

      //if template attributes matching
      templateJson.Rule.Assert.if.HoldsAt.Commitment.id =
        _action.commitments.id;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.type =
        _action.commitments.type;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.title =
        _action.commitments.title;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.role =
        _action.commitments.role;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.state =
        _action.commitments.state;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.Agent.address = x;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.Agent.type =
        _action.commitments.debtor;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.Agent.address = y;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.Agent.type = y;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.Fluent.id =
        _action.commitments.fluents[0].id;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.Fluent.type =
        _action.commitments.fluents[0].type;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.Fluent.title =
        _action.commitments.fluents[0].title;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.Fluent.value =
        _action.commitments.fluents[0].title;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.Fluent.balance =
        _action.commitments.fluents[0].balance;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.Fluent.original_balance =
        _action.commitments.fluents[0].original_balance;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.Fluent,
        (atomic = _action.commitments.fluents[0].atomic);
      templateJson.Rule.Assert.if.HoldsAt.Commitment.Fluent.terms =
        _action.commitments.fluents[0].terms;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.Fluent.terms_left =
        _action.commitments.fluents[0].terms_left;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.Fluent.Start.event =
        _action.commitments.fluents[0].start.event;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.Fluent.Start.action =
        _action.commitments.fluents[0].start.action;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.Fluent.Start.iteration =
        _action.commitments.fluents[0].start.iteration;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.Fluent.End.event =
        _action.commitments.fluents[0].end.event;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.Fluent.End.action =
        _action.commitments.fluents[0].end.action;
      templateJson.Rule.Assert.if.HoldsAt.Commitment.Fluent.End.iteration =
        _action.commitments.fluents[0].end.iteration;
      templateJson.Rule.Assert.if.Action.id = _action.id;
      templateJson.Rule.Assert.if.Action.operation = _action.operation;
      templateJson.Rule.Assert.if.Action.transition = _action.transition;
      templateJson.Rule.Assert.if.Action.message = _action.message;
      templateJson.Rule.Assert.if.Action.Commitment.id = _action.commitments.id;
      templateJson.Rule.Assert.if.Action.Commitment.type =
        _action.commitments.type;
      templateJson.Rule.Assert.if.Action.Commitment.title =
        _action.commitments.title;
      templateJson.Rule.Assert.if.Action.Commitment.role =
        _action.commitments.role;
      templateJson.Rule.Assert.if.Action.Commitment.state =
        _action.commitments.state;
      templateJson.Rule.Assert.if.Action.Commitment.Agent.address = x;
      templateJson.Rule.Assert.if.Action.Commitment.Agent.type =
        _action.commitments.debtor;
      templateJson.Rule.Assert.if.Action.Commitment.Agent.address = y;
      templateJson.Rule.Assert.if.Action.Commitment.Agent.type =
        _action.commitments.creditor;
      templateJson.Rule.Assert.if.Action.Commitment.Fluent.id =
        _action.commitments.fluents[0].id;
      templateJson.Rule.Assert.if.Action.Commitment.Fluent.type =
        _action.commitments.fluents[0].type;
      templateJson.Rule.Assert.if.Action.Commitment.Fluent.title =
        _action.commitments.fluents[0].title;
      templateJson.Rule.Assert.if.Action.Commitment.Fluent.value =
        _action.commitments.fluents[0].value;
      templateJson.Rule.Assert.if.Action.Commitment.Fluent.balance =
        _action.commitments.fluents[0].balance;
      templateJson.Rule.Assert.if.Action.Commitment.Fluent.original_balance =
        _action.commitments.fluents[0].original_balance;
      templateJson.Rule.Assert.if.Action.Commitment.Fluent.atomic =
        _action.commitments.fluents[0].atomic;
      templateJson.Rule.Assert.if.Action.Commitment.Fluent.terms =
        _action.commitments.fluents[0].terms;
      templateJson.Rule.Assert.if.Action.Commitment.Fluent.terms_left =
        _action.commitments.fluents[0].terms_left;
      templateJson.Rule.Assert.if.Action.Commitment.Fluent.Start.event =
        start[0];
      templateJson.Rule.Assert.if.Action.Commitment.Fluent.Start.action =
        start[1];
      templateJson.Rule.Assert.if.Action.Commitment.Fluent.Start.iteration =
        start[2];
      templateJson.Rule.Assert.if.Action.Commitment.Fluent.End.event = end[0];
      templateJson.Rule.Assert.if.Action.Commitment.Fluent.End.action = end[1];
      templateJson.Rule.Assert.if.Action.Commitment.Fluent.End.iteration =
        end[2];

      //on template attributes matching
      templateJson.Rule.Assert.do.Action.id = _action.id;
      templateJson.Rule.Assert.do.Action.operation = _action.operation;
      templateJson.Rule.Assert.do.Action.transition = _action.transition;
      templateJson.Rule.Assert.do.Action.message = _action.message;
      templateJson.Rule.Assert.do.Action.Commitment.id = _action.commitments.id;
      templateJson.Rule.Assert.do.Action.Commitment.type =
        _action.commitments.type;
      templateJson.Rule.Assert.do.Action.Commitment.title =
        _action.commitments.title;
      templateJson.Rule.Assert.do.Action.Commitment.role =
        _action.commitments.role;
      templateJson.Rule.Assert.do.Action.Commitment.state =
        _action.commitments.state;
      templateJson.Rule.Assert.do.Action.Commitment.Agent.address =
        _action.commitments.debtor;
      templateJson.Rule.Assert.do.Action.Commitment.Agent.type = x;
      templateJson.Rule.Assert.do.Action.Commitment.Agent.address =
        _action.commitments.creditor;
      templateJson.Rule.Assert.do.Action.Commitment.Agent.type = y;
      templateJson.Rule.Assert.do.Action.Commitment.Fluent.id =
        _action.commitments.fluents[0].id;
      templateJson.Rule.Assert.do.Action.Commitment.Fluent.type =
        _action.commitments.fluents[0].type;
      templateJson.Rule.Assert.do.Action.Commitment.Fluent.title =
        _action.commitments.fluents[0].title;
      templateJson.Rule.Assert.do.Action.Commitment.Fluent.value =
        _action.commitments.fluents[0].value;
      templateJson.Rule.Assert.do.Action.Commitment.Fluent.balance =
        _action.commitments.fluents[0].balance;
      templateJson.Rule.Assert.do.Action.Commitment.Fluent.original_balance =
        _action.commitments.fluents[0].original_balance;
      templateJson.Rule.Assert.do.Action.Commitment.Fluent.atomic =
        _action.commitments.fluents[0].atomic;
      templateJson.Rule.Assert.do.Action.Commitment.Fluent.terms =
        _action.commitments.fluents[0].terms;
      templateJson.Rule.Assert.do.Action.Commitment.Fluent.terms_left =
        _action.commitments.fluents[0].terms_left;
      templateJson.Rule.Assert.do.Action.Commitment.Fluent.Start.event =
        start[0];
      templateJson.Rule.Assert.do.Action.Commitment.Fluent.Start.action =
        start[1];
      templateJson.Rule.Assert.do.Action.Commitment.Fluent.Start.iteration =
        start[2];
      templateJson.Rule.Assert.do.Action.Commitment.Fluent.End.event = end[0];
      templateJson.Rule.Assert.do.Action.Commitment.Fluent.End.action = end[1];
      templateJson.Rule.Assert.do.Action.Commitment.Fluent.End.iteration =
        end[2];

      let time = _event_counter + "." + _code_action_counter + "." + _iteration;
      await writeRuleMLOutput(time, templateJson);

      // BUILD A DELAY FUNCTION TO READ THE RULE
      // let ruleMLTemplateOnRun = fs.readFileSync(
      //   "test/commitruleml/run/run-" + time + ".commitruleml",
      //   "utf8"
      // );
      // let rule = xmlParser.toJson(ruleMLTemplateOnRun, {
      //   reversible: true,
      //   object: true,
      // });

      // console.log(time);
      // console.log(rule);

      switch (_action.transition) {
        case "committed":
          await instance.commit(
            action.commitments.id,
            buyer,
            seller,
            action.commitments.fluents[0].id,
            action.commitments.fluents[0].balance,
            action.commitments.fluents[0].atomic
          );

          assert.equal("committed", state, "Saving state failed");

          break;
        case "activated":
          await instance.activate(action.commitments.id, buyer);

          assert.equal("activated", state, "Saving state failed");

          break;
        case "satisfied":
          await instance.satisfy(
            action.commitments.fluents[0].id,
            action.commitments.id,
            action.fulfillment_value
          );

          assert.equal("satisfied", state, "Saving state failed");

          // if (balance != undefined) {

          //     origin = "A";
          //     faction = 1;

          //     await updateFluentBalance(iteration.fluents.id, iteration.fluents.balance, balance, faction);

          //     await insertPartialFulfillment((iteration_counter + 1), iteration.events.id, iteration.iteration, iteration.fluents.id, iteration.attempt++, iteration.action, origin);
          // }
          // else {
          //     assert.equal(
          //         'satisfied',
          //         state,
          //         "Saving state failed"
          //     );
          // }
          break;
        case "cancel":
          await instance.cancel(
            iteration.fluents.id,
            iteration.fluents.commitments.id,
            iteration.fluents.value
          );

          break;
        case "assign":
          await instance.release(
            iteration.fluents.id,
            iteration.fluents.commitments.id,
            iteration.fluents.value
          );

          break;
        default:
      }

      /* manipulate commitment ton the on-chain ledger */

      console.log(hash);

      /* set the time */
      //let time = event_counter + "." + code_action_counter + "." + _attempt;

      /* insert hash and timestamp to action */
      // let insertHash = await insertHash(db_action_counter, hash);

      // /* update the RuleMl template */
      // let ruleMLTemplate = fs.readFileSync(
      //   "test/ruleml/template.ruleml",
      //   "utf8"
      // );
      // templateJson = xmlParser.toJson(ruleMLTemplate, {
      //   reversible: true,
      //   object: true,
      // });

      // /* insert data into the RuleMl template */
      // templateJson.Rule.on.Happens.Event.id = action.events.id;
      // templateJson.Rule.on.Happens.Event.id = action.events.title;

      // await writeRuleMLOutput(time, templateJson);

      /* Comparing blockchain hash to cloud hash */
      //assert.equal(insertHash, hash, "Saving state failed");
    }
    if (_event_counter > events.length) {
      console.log("Protocol run completed");
    }

    _db_action_counter++;
    _code_action_counter;
  });
});
