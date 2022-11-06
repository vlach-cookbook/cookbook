CXX:=g++
DEPENDENCIES:=jsoncpp icu-uc
CXXFLAGS:=-Wall -g -std=c++20 $(shell pkg-config --cflags $(DEPENDENCIES)) -DU_CHARSET_IS_UTF8=1 $(CXXEXTRAFLAGS)
LDFLAGS:=$(shell pkg-config --libs $(DEPENDENCIES))

all: tofirebase

tofirebase.o: tofirebase.cpp cb_database.h Makefile
cb_database.o: cb_database.cpp cb_database.h Makefile
cb_database.o: CXXEXTRAFLAGS=-w

tofirebase: tofirebase.o cb_database.o
	$(CXX) -o $@ $^ $(LDFLAGS)
