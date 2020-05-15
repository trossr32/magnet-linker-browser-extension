# Magnet Linker 

Magnet linker is an extension for both Chrome and the new chromium Microsoft Edge that extends magnet links on websites to enable the quick adding of torrents to Transmission via the RPC API.

Any magnet links found on a page are extended with a button displayed next to the link which sends that torrent straight to your Transmission instance. 

Custom HTML can be added both before and after the button element based on a search of a websites URL, as well as adjustment of the div float on the button HTML.

# Getting started

[Extension on the Chrome web store](https://chrome.google.com/webstore/detail/magnet-linker/neokhcngmjnlbnphpfmiidlljbpffecd)

[Extension on the Microsoft Edge add-ons store](https://microsoftedge.microsoft.com/addons/detail/iagaihihgeloakmheonacpldkpogggen)

Once the extension is installed on Chrome or Edge go to the options page and configure the extension.

## API

Fill out the respective fields to build the URL that points to your Transmission API.

## Magnet search

You can configure how magnet links are found on web pages by adding attributes or element types to search for. There are currently 2 ways that elements are found in the DOM:

### by an element's attribute

For example **href** will find the magnet link in an element like:

```<a href="magnet:?xt=urn:btih:d540fc48eb12f2833163eed6421d449dd8f1ce1f&amp;dn=Ubuntu+desktop+19.04+%2864bit%29" title="Download this torrent using magnet">Magnet link</a>```

### by an element's type

For example **code** will find the magnet link in an element like:

```<code class="myClass">magnet:?xt=urn:btih:d540fc48eb12f2833163eed6421d449dd8f1ce1f&amp;dn=Ubuntu+desktop+19.04+%2864bit%29</code>```

This kind of element searching is useful for searching on websites where magnet links are written out rather than linked, such as Reddit

## Customise injected HTML

On a site by site basis you can customise the HTML that surrounds the injected 'send to transmission' button, and also the float characteristics of the div. For example, on Zooqle it's worth setting the float
to none to better position the buttons on the page. The 'search' parameter must match all or part of the website's URL, so for Zooqle for example, just use 'zooqle'.

# Magnet storage

The extension stores all magnets that have been sent to the transmission API so that when a page is loaded, buttons can be markes as 'already sent' for those links already added. The Storage tab in options allows you to see all of these
magnets and clear down the list if you choose.

# Create package
Powershell scripts and batch files that execute those PS scripts are included but these simply zip the Extension or Edge Extension directories, as that's all that's required to publish this to the Chrome Web Store and Microsoft Edge Addons sites.

# Contribute
If you can make this extension better I'm happy for the help! Create a pull request and get in touch.
