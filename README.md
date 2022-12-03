# Cookbook

This is a port of Martin Vlach's Cookbook Windows app to the web.

The webserver, including the [prisma db schema](./webserver/prisma/schema.prisma), is in
[webserver/](./webserver/).

The C++ code to extract the data from the Windows app is in [import/](./import/).

A few helper utilities to deal with the database are in [db/](./db/).
