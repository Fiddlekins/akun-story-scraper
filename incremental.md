# Incremental mode

`cd` to your archive directory, then run `node /path/to/project/src/incremental.js [options]`.

The archive directory may contain special files:
- `credentials.json`
- `targets.yaml`

## Credentials file

Just like for the normal mode.

```
{
  "username": "...",
  "password": "..."
}
```

## Targets file

```yaml
## Quests are specified by their IDs as keys to a map structure.
QuestId1:
# Each quest entry may contain zero or more options. Supported ones are:

# If true, images will be downloaded and the image map updated. Otherwise, images won't be considered at all.
# Default: false
  img: true

# Chat processing mode. Supported values:
#   - skip:  don't process chat messages at all
#   - read:  read chat messages from already dumped files, but don't re-download them.
#            Useful if you want to download images from the chat without updating the chat.
#   - fetch: re-download all chat
# Default: skip
  chat: fetch

# If for some reason the scrapper can't determine the quest author's name, it can be set explicitly. Usually not needed.
# Default: undefined
  author: kas

QuestId2:
...
```
