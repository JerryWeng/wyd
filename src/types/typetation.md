# Type Documentation

Not all types are within the types folder, some are defined in their respective files

- SiteInfo: Used to organize data by date

```
{
  "2023-10-27": {
    "time": {
      "google.com": 1200,
      "github.com": 3600
    },
    "sessions": {
      "google.com": 8,
      "github.com": 4
    }
  }
}
```

- CombinedData: Used to organize data by domains to calculate for total times/sessions

```
{
  "google.com": {
    "time": 1200,
    "sessions": 8
  },
  "github.com": {
    "time": 3600,
    "sessions": 4
  }
}
```
