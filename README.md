<div align="center" margin="0 auto 20px">
  <h1><a href="https://bsky.app/profile/macrumorsbuyguide.bluesky.bot" target="_blank">@macrumorsbuyguide.bluesky.bot</a></h1>
  <p style="font-style: italic;">🦋 A bot for Bluesky which skeets out any changes to the MacRumors Buyers Guide</p>
  <div>
    <a href="https://app.fossa.com/projects/git%2Bgithub.com%2Fhimynameisdave%2Fmacrumors-buyersguide-bksy?ref=badge_shield&issueType=license" alt="FOSSA Status"><img src="https://app.fossa.com/api/projects/git%2Bgithub.com%2Fhimynameisdave%2Fmacrumors-buyersguide-bksy.svg?type=shield&issueType=license"/></a>
    <a href="https://app.fossa.com/projects/git%2Bgithub.com%2Fhimynameisdave%2Fmacrumors-buyersguide-bksy?ref=badge_shield&issueType=security" alt="FOSSA Status"><img src="https://app.fossa.com/api/projects/git%2Bgithub.com%2Fhimynameisdave%2Fmacrumors-buyersguide-bksy.svg?type=shield&issueType=security"/></a>
  </div>
</div>

---

A bot for Bluesky which posts ([skeets](https://www.theverge.com/2023/4/27/23701551/bluesky-skeets-now)) out any changes to the [MacRumors Buyers Guide](https://buyersguide.macrumors.com/).

This project uses a variation of [this technique](https://simonwillison.net/2020/Oct/9/git-scraping/) to periodically (four times a day) scrape the MacRumors Buyer's Guide, commit any changes to [this file](https://github.com/himynameisdave/macrumors-buyersguide-bksy/blob/main/buyers-guide.json), then skeet out any changes to [this account](https://bsky.app/profile/macrumorsbuyguide.bsky.social).

### Developing

If you want to work with this repository, all you really need is a >20 version of Node. Prefer to use [nvm](https://github.com/nvm-sh/nvm) for this.

```bash
nvm use
yarn install
```

If you want to simply run the scraper, you can build and run it via:

```bash
yarn start
# OR
npm start
```

### Contributing

Issues and pull requests are happily accepted. Take care to adhere to the [styleguide](https://github.com/himynameisdave/eslint-config-himynameisdave).
