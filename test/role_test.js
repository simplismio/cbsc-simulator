const CBSC = artifacts.require("CBSC");

contract("CBSC Simulation", async (accounts) => {

    require('dotenv').config();
    const fs = require('fs');
    const sb = require('@supabase/supabase-js');
    const formatXml = require("xml-formatter");
    const xmlParser = require("xml2json");
    const supabase = sb.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

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
        let { data: events, error } = await supabase
            .from('events')
            .select("id")
        return events;
    }

    async function getActionCounter(){
         let { data: actions, error } = await supabase
            .from('actions')
            .select(`
                    id
                `)
        return actions[0].id
    }

    async function queryActionData(_action_counter) {

        let { data: action, error } = await supabase
            .from('actions')
            .select(`
                    fulfillment_value,
                    message,
                    state,
                    events (
                        id, title
                    ),
                    commitments (
                        id, title, state, debtor, creditor, fluents (
                        id, title, atomic, balance, max_terms, terms_left, original_balance
                    )
                    )
                `)
            .eq('id', _action_counter);
        return action[0];
    }

    async function insertPartialFulfillment(_id, _event_id, _iteration, _fluent_id, _attempt, _action, _origin, _faction) {

        let {
            data,
            error
        } =
            await supabase
                .from('iterations')
                .insert([{
                    id: _id,
                    event_id: _event_id,
                    iteration: _iteration,
                    fluent_id: _fluent_id,
                    attempt: _attempt,
                    action: _action,
                    origin: _origin,
                }
                ]);
        return data;
    }

    async function insertHash(_action_id, _hash) {
        const { data, error } = await supabase
            .from('actions')
            .update([
                {
                    hash: _hash,
                    hash_timestamp: Math.floor(Date.now() / 1000)
                }]
            ).
            eq('id', _action_id)
            console.log(data)
            console.log(error)
        return ;
    }

    async function writeRuleMLOutput(time, json) {
        /*
         * Write transaction hash back protocol run and store it in bc-output.xml
         * */
        fs.writeFile("test/ruleml/" + time + ".ruleml",
            formatXml(xmlParser.toXml(json), {
                collapseContent: false
            }),
            function (err, result) {
                if (err) {
                    console.log("Unable to write RuleML file")
                } else {
                    console.log();
                    console.log("  RuleML template file " + time + ".ruleml generated")
                    console.log();
                }
            }
        )
    }


    before('Preparing CBSC', async () => {
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
    })


    it("CBSC Protocol Run", async () => {

        let event_counter = 1;
        let db_action_counter = await getActionCounter();
        let origin = "SA";
        let faction;

        let events = await queryEventData();

        while (event_counter <= events.length) {

            /* Read the CommitRuleML template */
            let ruleMLTemplate = fs.readFileSync("test/commitruleml/input/template.commitruleml", 'utf8');
            templateJson = xmlParser.toJson(ruleMLTemplate, {
                reversible: true,
                object: true
            });

            console.log(templateJson)


            let action = await queryActionData(db_action_counter);
            let code_action_counter = 1
            let _attempt = 0

            if (action == null) {
                console.log('Action finished');
                event_counter++;
            }
            else {

                /* manipulate commitment ton the on-chain ledger */
                switch (action.state) {
                    case 'committed':
                        await instance.commit(action.commitments.id, buyer, seller, action.commitments.fluents[0].id, action.commitments.fluents[0].balance, action.commitments.fluents[0].atomic);

                        assert.equal(
                            'committed',
                            state,
                            "Saving state failed"
                        );

                        break;
                    case 'activated':
                        await instance.activate(action.commitments.id, buyer);

                        assert.equal(
                            'activated',
                            state,
                            "Saving state failed"
                        );

                        break;
                    case 'satisfied':
                        await instance.satisfy(action.commitments.fluents[0].id, action.commitments.id, action.fulfillment_value);

                                                    assert.equal(
                                'satisfied',
                                state,
                                "Saving state failed"
                            );

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
                    case 'cancel':

                        await instance.cancel(iteration.fluents.id, iteration.fluents.commitments.id, iteration.fluents.value);

                        break;
                    case 'assign':

                        await instance.release(iteration.fluents.id, iteration.fluents.commitments.id, iteration.fluents.value);

                        break;
                    default:
                }

                /* set the time */
                let time = event_counter + "." + code_action_counter + "." + _attempt;

                /* insert hash and timestamp to action */
                let insertHash = await insertHash(db_action_counter, hash);

                /* update the RuleMl template */
                let ruleMLTemplate = fs.readFileSync("test/ruleml/template.ruleml", 'utf8');
                templateJson = xmlParser.toJson(ruleMLTemplate, {
                    reversible: true,
                    object: true
                });


                /* insert data into the RuleMl template */
                templateJson.Rule.on.Happens.Event.id = action.events.id;
                templateJson.Rule.on.Happens.Event.id = action.events.title;

                await writeRuleMLOutput(time, templateJson);

                /* Comparing blockchain hash to cloud hash */
                assert.equal(
                    insertHash,
                    hash,
                    "Saving state failed"
                );

            }
            if (event_counter > events.length) {
                console.log('Protocol run completed');
            }

            db_action_counter++;
            code_action_counter
        }

    });
});

