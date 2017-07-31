# Nodeblock

Nodeblock is a local DNS server and site blocker that emphasises on performance.
By using a local, in-memory database, it replies to DNS requests as fast as possible, without additional traffic when it already has the needed information.

# Installation

-   Ensure that NodeJS is installed
-   On Linux, type `sudo setcap 'cap_net_bind_service=+ep' $(which node)` into a terminal to make sure Node can use port 53 for DNS without root
-   [Download or clone the repo](https://github.com/DecentM/nodeblock/archive/master.zip)
-   Type `npm install` or `yarn install`
-   Type `npm start` or `yarn start`
-   Presto! You can now query the server for addresses.

### There are a few limitations to Nodeblock at this time:
-   It doesn't block sites yet. This is currently in development.
-   Only one domain may be asked for at once (This is an issue with the RFC, I don't plan on implementing multiple domains per query. If you have a use case, please feel pree to create a pull request!)
-   There is no web interface, because there's not much to control yet.
