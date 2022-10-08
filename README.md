# Cookbook

This is a port of Martin Vlach's Cookbook Windows app to the web. The first
attempt using [Firebase and Angular](./angularfire/) to try to write an entirely
client-side program. This failed because I actually needed some trusted
server-side processing to make everything work. Now I'm trying a [server-based
design using Fly.io](./fly/).

The C++ code to extract the data from the Windows app is in [import/](./import/).
