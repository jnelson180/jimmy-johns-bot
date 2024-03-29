const Discord = require("discord.js");
const config = require("./config.json");
const client = new Discord.Client();
const util = require("util");
const request = require("request");
const Cookie = require("request-cookies").Cookie;

// persist orders here until they are completed
const Orders = {
    // key: username, value: OrderObject
}

const headers = {
    "__requestverificationtoken": "",
    "cookie": "",
    "origin": "https://online.jimmyjohns.com",
    "referer": "https://online.jimmyjohns.com/verify-delivery-address",
    "x-newrelic-id": "VgYDUVRVGwEGU1haBQI=",
    "x-olo-request": 1,
    "x-requested-with": "XMLHttpRequest",
    "accept": "application/json, text/javascript, */*; q=0.01",
    "accept-encoding": "gzip, deflate, br",
    "accept-language": "en-US,en;q=0.9,es;q=0.8"
}

client.on("message", async message => {
    // This event will run on every single message received, from any channel or DM.

    // if requester is a bot, return early
    if (message.author.bot) {
        return;
    }

    // if command is malformed, return early
    if (message.content.indexOf(config.prefix) !== 0) {
        return;
    }

    // steps: 0 = get menu, 1 =
    console.log(message)
    const user = `${ message.author.username }#${ message.author.discriminator }`;
    Orders[user] = {
        createdAt: message.createdTimestamp,
        step: 0,
        order: {

        }
    };

    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();


    if (command === "order") {
        // auth credentials for jimmy's api
        let requestverificationtokenCookie = "";
        let ctCookie = "";
        let closestStore = {};
        let closestStoreInfo = {};

        request.get("https://online.jimmyjohns.com/", (err, res, body) => {
            const rawCookies = res.headers["set-cookie"];

            for (var i in rawCookies) {
                const cookie = new Cookie(rawCookies[i]);

                // parse requestverificationtoken as requests expect it
                if (cookie.key === "__RequestVerificationToken") {
                    requestverificationtokenCookie = cookie.value;
                }

                // parse cookie as requests expect it
                if (cookie.key === "CT") {
                    ctCookie = `${ cookie.key }=${ cookie.value };`;
                }
            }

            headers.cookie = `${ ctCookie } __RequestVerificationToken=${ requestverificationtokenCookie }`;
            headers.__requestverificationtoken = requestverificationtokenCookie;

            // get the locations
            request.post("https://online.jimmyjohns.com/api/vendors/search?address=1954%20Maple%20Ave&building=&city=Loves%20Park&zipCode=61111&handoffMode=Delivery&timeWantedType=2",
            {
                headers: {
                    "__requestverificationtoken": requestverificationtokenCookie,
                    "cookie": ctCookie,
                    "origin": "https://online.jimmyjohns.com",
                    "referer": "https://online.jimmyjohns.com/verify-delivery-address",
                    "x-newrelic-id": "VgYDUVRVGwEGU1haBQI=",
                    "x-olo-request": 1,
                    "x-requested-with": "XMLHttpRequest"
                }
            },
            (err, res) => {
                closestStore = JSON.parse(res.body)["vendor-search-results"][0];

                if (closestStore.hasOnlineOrdering && closestStore.isAcceptingOrders) {
                    message.reply(`Jimmy John's in ${ closestStore.city }, ${ closestStore.state } is open and accepting orders!`);

                    request.get(`https://online.jimmyjohns.com/api/vendors/${ closestStore.slug }`,
                    {
                        headers: {
                            ...headers
                        },
                        gzip: true
                    },
                    (err, res, body) => {
                        const jjStore = JSON.parse(body);
                        const { categories, vendor } = jjStore;

                        let optionsStr = "";
                        categories.forEach((option, index) => optionsStr += `${ index }: ${ option.name }${ index !== categories.length - 1 ? "\n" : "" }`);
                        // message.reply(`Choose an option by number by typing $pick, then your number: \n\n${ optionsStr }`);

                        const ids = [].concat.apply([], categories.map((cat, i) => cat.products));

                        const idsString = `ids%5B%5d=${ ids.join("ids%5B%5D=").split("ids").join("&ids") }`;

                        request.get(`https://online.jimmyjohns.com/api/vendors/${ vendor.id }/products/?ids=${ idsString }`,
                            {
                                headers,
                                gzip: true
                            },
                            (err, res) => {
                                const body = JSON.parse(res.body);
                                const products = body.products;
                                console.log(util.inspect(body.products[0]));
                                const output = products.map((prod, i) => `${ i }: ${ prod.name }`).join("\n");
                                message.reply(`Choose an option by number by typing $pick, then your number: \n\n${ output }`);
                            }
                        )
                    })
                } else {
                    message.reply("Sorry, your closest Jimmy John's is unavailable for orders at this time.");
                }
            })
        });
    }
});

client.login(config.token);