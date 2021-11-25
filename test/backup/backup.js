// const CBSC = artifacts.require("CBSC");

// contract("CBSC Simulation", async (accounts) => {

//     require('dotenv').config();
//     const fs = require('fs');
//     const sb = require('@supabase/supabase-js');
//     const formatXml = require("xml-formatter");
//     const xmlParser = require("xml2json");
//     const config = JSON.parse(fs.readFileSync('./test/config.json', 'utf8'));
//     const supabase = sb.createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

//     let x = accounts[1];
//     let y = accounts[2];
//     let xz = accounts[3];
//     let yz = accounts[4];
//     let buyer = x; //xz
//     let seller = y; //yz

//     /*
//     * Instance to connect to smart contract via Ganache-CLI
//     * */
//     let instance;
//     let hash;
//     let balance;
//     let state;

//     async function getSimulations() {
//         let { data: simulations, error } = await supabase
//             .from('simulations')
//             .select()
//         return simulations;
//     }

//     async function insertTransaction(_event_id, _iteration, _attempt, _commitment_id, _action, _hash, _time, _origin) {
//         const { data, error } = await supabase
//             .from('transactions')
//             .insert([
//                 {
//                     event_id: _event_id,
//                     iteration: _iteration,
//                     attempt: _attempt,
//                     commitment_id: _commitment_id,
//                     action: _action,
//                     hash: _hash,
//                     time: _time,
//                     origin: _origin
//                 }]
//             )
//         return data;
//     }

//     async function writeRuleMLOutput(time, json) {
//         /*
//          * Write transaction hash back protocol run and store it in bc-output.xml
//          * */
//         fs.writeFile("test/ruleml/" + time + ".ruleml",
//             formatXml(xmlParser.toXml(json), {
//                 collapseContent: false
//             }),
//             function (err, result) {
//                 if (err) {
//                     console.log("Unable to write RuleML file")
//                 } else {
//                     console.log();
//                     console.log("  RuleML template file " + time + ".ruleml generated")
//                     console.log();
//                 }
//             }
//         )
//     }


//     before('Preparing CBSC', async () => {
//         instance = await CBSC.deployed();

//         /* Clear old transactions in the cloud */
//         // async function clearTransactions() {
//         //     let {
//         //         data,
//         //         error,
//         //         count
//         //     } = await supabase
//         //         .from('transactions')
//         //         .select('id', {}, {
//         //             count: 'exact'
//         //         });

//         //     if (data == '') {
//         //         var start = 0;
//         //         var counter = 0;
//         //     } else {
//         //         var start = data[0].id;
//         //         var counter = data[0].id + data.length;
//         //     }

//         //     for (var i = start ?? 0; i < counter; i++) {
//         //         await supabase
//         //             .from('transactions')
//         //             .delete()
//         //             .match({
//         //                 id: i
//         //             })
//         //     }
//         // }
//         // await clearTransactions();
//         /*
//          * Setup roles for test, defaults to x & y
//          * Optional functions to delegate or assign
//          */
//         await instance.setupRoles(buyer, seller);
//         //await instance.grantbuyerRole(xz);
//         //await instance.grantsellerRole(xy);

//         instance.StateLog({}, async (error, result) => {
//             if (error) {
//                 console.log(error);
//             }
//             if (result) {
//                 hash = result.transactionHash;
//                 state = result.args.state;

//             }
//         });

//         instance.PartialSatisfactionLog({}, async (error, result) => {
//             if (error) {
//                 console.log(error);
//             }
//             if (result) {
//                 balance = result.args.balance.words[0];
//                 console.log(balance);

//             }
//         });
//     })


//     it("CBSC Protocol Run", async () => {

//         let simulations = await getSimulations()

//         for (var i = 0; i < simulations.length; i++) {

//                switch (simulations[i].state) {
//                     case 'committed':
//                         await instance.commit(simulations[i].commitment_id, simulations[i].debtor, simulations[i].seller);

//                         assert.equal(
//                             'committed',
//                             state,
//                             "Saving state failed"
//                         );

//                         break;
//                     // case 'activated':
//                     //     await instance.activate(iteration.fluents.commitments.id, buyer);

//                     //     assert.equal(
//                     //         'activated',
//                     //         state,
//                     //         "Saving state failed"
//                     //     );

//                     //     break;
//                     // case 'satisfied':
//                     //     await instance.satisfy(iteration.fluents.id, iteration.fluents.commitments.id, (iteration.fluents.balance / iteration.fluents.faction));

//                     //     if (balance != undefined) {

//                     //         origin = "A";
//                     //         faction = 1;

//                     //         await updateFluentBalance(iteration.fluents.id, iteration.fluents.balance, balance, faction);

//                     //         await insertPartialFulfillment((iteration_counter + 1), iteration.events.id, iteration.iteration, iteration.fluents.id, iteration.attempt++, iteration.action, origin);
//                     //     }
//                     //     else {
//                     //         assert.equal(
//                     //             'satisfied',
//                     //             state,
//                     //             "Saving state failed"
//                     //         );
//                     //     }
//                     //     break;
//                     // case 'cancel':

//                     //     await instance.cancel(iteration.fluents.id, iteration.fluents.commitments.id, iteration.fluents.value);

//                     //     break;
//                     // case 'assign':

//                     //     await instance.release(iteration.fluents.id, iteration.fluents.commitments.id, iteration.fluents.value);

//                     //     break;
//                     default:
//         }

//         //     /* set the time */
//         //     let time = iteration.events.id + "." + iteration.iteration + "." + iteration.attempt;

//         //     /* insert transaction into off-chain ledger */
//         //     let transaction = await insertTransaction(iteration.events.id, iteration.iteration, iteration.attempt, iteration.fluents.commitments.id, iteration.action, hash, time, origin);

//         //     /* update the RuleMl template */
//         //     let ruleMLTemplate = fs.readFileSync("test/ruleml/template.ruleml", 'utf8');
//         //     templateJson = xmlParser.toJson(ruleMLTemplate, {
//         //         reversible: true,
//         //         object: true
//         //     });

//         //     /* insert data into the RuleMl template */
//         //     templateJson.Rule.on.Happens.Event.id = iteration.events.id;
//         //     await writeRuleMLOutput(time, templateJson);

//         /* Comparing blockchain hash to cloud hash */
//         // assert.equal(
//         //     transaction[0].hash,
//         //     hash,
//         //     "Saving state failed"
//         // );



//         //}

//         // while (event_counter <= events.length) {

//         //     let iteration = await queryIterationData(iteration_counter);

//         //     if (iteration == null) {
//         //         console.log('Iteration finished');
//         //         event_counter++;
//         //     }
//         //     else {

//         //         /* manipulate commitment ton the on-chain ledger */
//         //         switch (iteration.action) {
//         //             case 'commit':
//         //                 await instance.commit(iteration.fluents.commitments.id, buyer, seller, iteration.fluents.id, iteration.fluents.value, iteration.fluents.atomic);

//         //                 assert.equal(
//         //                     'committed',
//         //                     state,
//         //                     "Saving state failed"
//         //                 );

//         //                 break;
//         //             case 'activate':
//         //                 await instance.activate(iteration.fluents.commitments.id, buyer);

//         //                 assert.equal(
//         //                     'activated',
//         //                     state,
//         //                     "Saving state failed"
//         //                 );

//         //                 break;
//         //             case 'satisfy':
//         //                 await instance.satisfy(iteration.fluents.id, iteration.fluents.commitments.id, (iteration.fluents.balance / iteration.fluents.faction));

//         //                 if (balance != undefined) {

//         //                     origin = "A";
//         //                     faction = 1;

//         //                     await updateFluentBalance(iteration.fluents.id, iteration.fluents.balance, balance, faction);

//         //                     await insertPartialFulfillment((iteration_counter + 1), iteration.events.id, iteration.iteration, iteration.fluents.id, iteration.attempt++, iteration.action, origin);
//         //                 }
//         //                 else {
//         //                     assert.equal(
//         //                         'satisfied',
//         //                         state,
//         //                         "Saving state failed"
//         //                     );
//         //                 }
//         //                 break;
//         //             case 'cancel':

//         //                 await instance.cancel(iteration.fluents.id, iteration.fluents.commitments.id, iteration.fluents.value);

//         //                 break;
//         //             case 'assign':

//         //                 await instance.release(iteration.fluents.id, iteration.fluents.commitments.id, iteration.fluents.value);

//         //                 break;
//         //             default:
//         //         }

//         //         /* set the time */
//         //         let time = iteration.events.id + "." + iteration.iteration + "." + iteration.attempt;

//         //         /* insert transaction into off-chain ledger */
//         //         let transaction = await insertTransaction(iteration.events.id, iteration.iteration, iteration.attempt, iteration.fluents.commitments.id, iteration.action, hash, time, origin);

//         //         /* update the RuleMl template */
//         //         let ruleMLTemplate = fs.readFileSync("test/ruleml/template.ruleml", 'utf8');
//         //         templateJson = xmlParser.toJson(ruleMLTemplate, {
//         //             reversible: true,
//         //             object: true
//         //         });

//         //         /* insert data into the RuleMl template */
//         //         templateJson.Rule.on.Happens.Event.id = iteration.events.id;
//         //         await writeRuleMLOutput(time, templateJson);

//         //         /* Comparing blockchain hash to cloud hash */
//         //         // assert.equal(
//         //         //     transaction[0].hash,
//         //         //     hash,
//         //         //     "Saving state failed"
//         //         // );

//         //     }
//         //     if (event_counter > events.length) {
//         //         console.log('Protocol run completed');
//         //     }

//         //     iteration_counter++;
//         // }

//         // assert.equal(
//         //     'committed',
//         //     state,
//         //     "On-chain state does not match off-chain input"
//         // );




//     });
// });

