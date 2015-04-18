CXX:=g++
CXXFLAGS:=-g -std=gnu++11 $(shell pkg-config --cflags jsoncpp)
LDFLAGS:=$(shell pkg-config --libs jsoncpp)

all: tojson

tojson.o: tojson.cpp cb_database.h Makefile
cb_database.o: cb_database.cpp cb_database.h Makefile

tojson: tojson.o cb_database.o
	$(CXX) -o $@ $^ $(LDFLAGS)
