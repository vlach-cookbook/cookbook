//PAGE
// ************************************************************************
// cb_database.cpp
// ************************************************************************
//
// Implementation of the Cookbook database
//
//------------------------------------------------------------------------
//
// Copyright C 2002
// Lynguent, Inc
// An Unpublished Work - All Rights Reserved
//
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

#include <stdio.h>

#include <iomanip>
#include <algorithm>

#include "cb_database.h"

using namespace std;

#define N_BUF 1000000

CB_StringTable theStringTable;
CB_StringTable*	CB_String::_theStringTable_p = &theStringTable;

//PAGE
// ************************************************************************
std::ostream&
operator << (
    std::ostream&		o,
    const CB_String	s
)
// ************************************************************************
{
    o << s.c_str();
    return o;
}

//PAGE
// ************************************************************************
CB_String::CB_String()
// ************************************************************************
{
    _itor = _theStringTable_p -> Insert( "", 0 );
}

//PAGE
// ************************************************************************
CB_String::CB_String(
    const char*	s
)
// ************************************************************************
{
    _itor = _theStringTable_p -> Insert( s, strlen(s) );
    assert( (*_itor).second.refCount > 0 );
}

//PAGE
// ************************************************************************
CB_String::CB_String(
    const char*	s,
    size_t	l
)
// ************************************************************************
{
    _itor = _theStringTable_p -> Insert( s, l );
    assert( (*_itor).second.refCount > 0 );
}

//PAGE
// ************************************************************************
CB_String::~CB_String()
// ************************************************************************
{
    assert( (*_itor).second.refCount > 0 );
    (*_itor).second.refCount--;
    if ( (*_itor).second.refCount == 0 ) {
	_theStringTable_p -> Erase( _itor );
    }
}

//PAGE
// ************************************************************************
CB_String::CB_String(
    const CB_String& o
)
// ************************************************************************
{
    _itor = o._itor;
    (*_itor).second.refCount++;
    assert( (*_itor).second.refCount > 1 );
}

//PAGE
// ************************************************************************
CB_String&
CB_String::operator=(
    const CB_String& o
)
// ************************************************************************
{
    //...Delete the current reference of this object
    assert( (*_itor).second.refCount > 0 );
    (*_itor).second.refCount--;
    if ( (*_itor).second.refCount == 0 ) {
	_theStringTable_p -> Erase( _itor );
    }

    _itor = o._itor;
    (*_itor).second.refCount++;
    return *this;
}

//PAGE
// ************************************************************************
CB_StringTable_t::iterator
CB_StringTable::Insert(
    const char*	s,
    size_t	l
)
// ************************************************************************
{
    //...Insert the string into the string table (or find it there)
    pair< CB_StringTable_t::iterator, bool > result =
		_byString.insert( CB_StringTable_t::value_type(
					string(s,l), CB_StringData() ) );

    CB_StringTable_t::iterator itor = result.first;
    
    //...Next free address
    size_t address;
    if ( _freeAddresses.empty() ) {
	address = _byAddress.size();
	_byAddress.push_back( CB_StringTable_t::iterator() );
    }
    else {
	address = _freeAddresses.back();
	_freeAddresses.pop_back();
    }

    (*itor).second.refCount++;
    (*itor).second.address = address;

    _byAddress[ address ] = itor;

    return itor;
}

//PAGE
// ************************************************************************
void
CB_StringTable::Print(
    std::ostream&	o
)
// ************************************************************************
{
    CB_StringTable_t::iterator iStr = _byString.begin();
    CB_StringTable_t::iterator iStrEnd = _byString.end();

    for ( ; iStr != iStrEnd; iStr++ ) {
	o << setw(5) << (*iStr).second.refCount << " " <<
	     setw(5) << (*iStr).first.size() << " " <<
			'"' << (*iStr).first << '"' << endl;
    }
}

//PAGE
// ************************************************************************
void
CB_Ingredient::Print(
    std::ostream& o
)
// ************************************************************************
{
    o << setw(10) << setiosflags(ios::left) << _quantity;
    o << setw(13) << setiosflags(ios::left) << _measurement;
    o << setw(22) << setiosflags(ios::left) << _preparation;
    o << setw(22) << setiosflags(ios::left) << _ingredient;
    o << endl;
}

//PAGE
// ************************************************************************
void
CB_Recipe::Clear()
// ************************************************************************
{
    CB_Ingredient_pVector_t::iterator iIng = _ingredients.begin();
    CB_Ingredient_pVector_t::iterator iIngEnd = _ingredients.end();

    for ( ; iIng != iIngEnd ; iIng++ ) {
	delete (*iIng);
    }
    _ingredients.clear();

    _directions.clear();
};

//PAGE
// ************************************************************************
void
CB_Recipe::Print(
    std::ostream& o
)
// ************************************************************************
{
    size_t i;
    size_t n;

    size_t delimLen = 40;
    size_t nameLen = _name.size();
    size_t leftLen = 0;
    if ( nameLen < delimLen ) {
	leftLen = (delimLen - nameLen) / 2;
    }

    o << "          ";
    for ( i = 0 ; i < delimLen ; i++ ) o << '-'; o << endl;

    o << "          ";
    for ( i = 0 ; i < leftLen ; i++ ) o << ' '; o << _name << endl;

    o << "          ";
    for ( i = 0 ; i < delimLen ; i++ ) o << '-'; o << endl;

    o << endl;

    if ( _serves.size() > 0 ) {
	o << "Serves " << _serves << endl;
    }

    o << setw(10) << setiosflags(ios::left) << "Quantity";
    o << setw(13) << setiosflags(ios::left) << "Measurement";
    o << setw(22) << setiosflags(ios::left) << "Preparation";
    o << setw(22) << setiosflags(ios::left) << "Ingredient";
    o << endl;
    o << endl;

    n = _ingredients.size();
    for ( i = 0 ; i < n ; i++ ) {
	_ingredients[i] -> Print(o);
    }

    o << endl << "Directions:" << endl;
    o << endl;

    PrintDirections( o );

    if ( CategorySize() > 0 ) {
	o << endl;
	o << "Categories: ";
	if ( _category1.size() > 0 ) o << _category1 << "    ";
	if ( _category2.size() > 0 ) o << _category2 << "    ";
	if ( _category3.size() > 0 ) o << _category3 << "    ";
	if ( _category4.size() > 0 ) o << _category4 << "    ";
	o << endl;
    }

    if ( _date.size() > 0 ) {
	o << endl;
	o << "Modified " << _date << endl;
    }

    o << endl;
}

//PAGE
// ************************************************************************
void
CB_Recipe::PrintDirections(
    std::ostream& o
)
// ************************************************************************
{
    vector< CB_String >::iterator iDir = _directions.begin();
    vector< CB_String >::iterator iDirEnd = _directions.end();

    for ( ; iDir != iDirEnd ; iDir++ ) {
	o << (*iDir) << endl;
    }
}

//PAGE
// ************************************************************************
void
CB_Recipe::Copy(
    const CB_Recipe& o
)
// ************************************************************************
{
    _name = o._name;
    _serves = o._serves;
    _category1 = o._category1;
    _category2 = o._category2;
    _category3 = o._category3;
    _category4 = o._category4;
    _date = o._date;

    CB_Ingredient_pVector_t::const_iterator iIng = o._ingredients.begin();
    CB_Ingredient_pVector_t::const_iterator iIngEnd = o._ingredients.end();

    for ( ; iIng != iIngEnd ; iIng++ ) {
	_ingredients.push_back( new CB_Ingredient( *(*iIng) ) );
    }

    vector< CB_String >::const_iterator iDir = o._directions.begin();
    vector< CB_String >::const_iterator iDirEnd = o._directions.end();

    for ( ; iDir != iDirEnd ; iDir++ ) {
	_directions.push_back( *iDir );
    }
}

//PAGE
// ************************************************************************
void
CB_Book::Read(
    const char*	fName
)
// ************************************************************************
{
    Clear();
    theStringTable.Clear();

    CB_Stream stream( fName, "rb" );
    stream >> theStringTable;
    stream >> *this;

    Index();
}

//PAGE
// ************************************************************************
void
CB_Book::Write(
    char*	fName
)
// ************************************************************************
{
    CB_Stream stream( fName, "wb" );
    stream << theStringTable;
    stream << *this;
}

//PAGE
// ************************************************************************
void
CB_Book::MakeBackup(
    char*	fName
)
// ************************************************************************
{
    string backupName("backup_");
    backupName += fName;

    cout << backupName << endl;

    // Open the file in binary mode, so that no weird translation happens
    FILE* inFile = fopen(fName,"rb");
    FILE* outFile = fopen(backupName.c_str(),"wb");

    if ( inFile == NULL ) {
	printf("Cannot open the input file %s\n",fName);
    }
    if ( inFile == NULL ) {
	printf("Cannot open the output file %s\n",backupName.c_str() );
    }

    unsigned char buf[N_BUF];
    int n;
    while ( (n = fread(buf,1,N_BUF,inFile) ) > 0 ) {
	fwrite(buf,1,n,outFile);
    }

    fclose( inFile );
    fclose( outFile );
}

//PAGE
// ************************************************************************
void
CB_Book::Clear()
// ************************************************************************
{
    CB_Recipe_pVector_t::iterator iRec = _recipes.begin();
    CB_Recipe_pVector_t::iterator iRecEnd = _recipes.end();

    for ( ; iRec != iRecEnd ; iRec++ ) {
	delete (*iRec);
    }

    _recipes.clear();

    _sortedByName.clear();
    _sortedByCategory.clear();
    _sortedByIngredient.clear();
}

//PAGE
// ************************************************************************
void
CB_Book::Add(
    CB_Recipe*	recipe_p
)
// ************************************************************************
{
    //...Add it to the book
    _recipes.push_back( recipe_p );
    IndexRecipe( recipe_p );
}

//PAGE
// ************************************************************************
void
CB_Book::Delete(
    CB_Recipe*	recipe_p
)
// ************************************************************************
{
    //...Delete references to it from the indices
    DeleteFromMap( recipe_p, _sortedByName );
    DeleteFromMap( recipe_p, _sortedByCategory );
    DeleteFromMap( recipe_p, _sortedByIngredient );

    //...Delete it from the list of recipes
    CB_Recipe_pVector_t::iterator itor = find (
				_recipes.begin(), _recipes.end(), recipe_p );
    assert ( itor != _recipes.end() );
    _recipes.erase( itor );

    delete recipe_p;
}

//PAGE
// ************************************************************************
void
CB_Book::Print(
    std::ostream& o
)
// ************************************************************************
{
    size_t i;
    size_t nRecipe = _recipes.size();
    for ( i = 0 ; i < nRecipe ; i++ ) {
	o << endl;
	_recipes[i] -> Print(o);
    }
}

//PAGE
// ************************************************************************
void
CB_Book::PrintSortedNames(
    std::ostream& o
)
// ************************************************************************
{
    o << _sortedByName.size() << " entries" << endl;

    CB_RecipeMap_t::iterator iRec = _sortedByName.begin();
    CB_RecipeMap_t::iterator iRecEnd = _sortedByName.end();

    for ( ; iRec != iRecEnd ; iRec++ ) {
	CB_Recipe* recipe_p = (*iRec).second;
	o << recipe_p -> _name << endl;
    }
}

//PAGE
// ************************************************************************
void
CB_Book::PrintSortedCategories(
    std::ostream& o
)
// ************************************************************************
{
    o << _sortedByCategory.size() << " entries" << endl;

    CB_RecipeMap_t::iterator iRec = _sortedByCategory.begin();
    CB_RecipeMap_t::iterator iRecEnd = _sortedByCategory.end();

    while ( iRec != iRecEnd ) {
	CB_String key = (*iRec).first;
	o << key << endl;

	size_t n = _sortedByCategory.count( key );
	size_t i;
	for ( i = 0 ; i < n ; i++, iRec++ ) {
	    CB_Recipe* recipe_p = (*iRec).second;
	    o << "    " << recipe_p -> _name << endl;
	}
    }
}

//PAGE
// ************************************************************************
void
CB_Book::PrintSortedIngredients(
    std::ostream& o
)
// ************************************************************************
{
    o << _sortedByIngredient.size() << " entries" << endl;

    CB_RecipeMap_t::iterator iRec = _sortedByIngredient.begin();
    CB_RecipeMap_t::iterator iRecEnd = _sortedByIngredient.end();

    while ( iRec != iRecEnd ) {
	CB_String key = (*iRec).first;
	o << key << endl;

	size_t n = _sortedByIngredient.count( key );
	size_t i;
	for ( i = 0 ; i < n ; i++, iRec++ ) {
	    CB_Recipe* recipe_p = (*iRec).second;
	    o << "    " << recipe_p -> _name << endl;
	}
    }

}

//PAGE
// ************************************************************************
void
CB_Book::Import(
    char*	fName
)
// ************************************************************************
/*

Apparently the first 0x33800 = 0634000 = 210944 bytes are devoted
to indeces. I can't decipher them.

The following information is the data, separated into blocks of records

Each record consists of bytes:
    record number in the block	(unsigned char)
    character count		(unsigned char)
    ASCII data (character count of them)
An empty record is not kept (i.e. no "0" counts)

For each recipe, the information is as follows:

Block 0
    Record 0	Recipe name
    Record 1	Serves: count
    Record 2-5	Classification(s)
    Record 6-9	quadruples of Quantity,Measure,Prepartion,Ingredient
	   ...
	   26-29 - " -
    Record 30	Date. Probably entry date.
Block 1
    Record 0-3	quadruples
	   ...
	   32-35 - " -
Block 2
    All records	Description

There are some special cases discovered by trial and error.
They are documented by the code;

It appears that the "read()" function (in cygwin, at least),
converts the combination CR/LF to LF, thus messing up
the actual data 10 13.

*/
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
{
    // Open the file in binary mode, so that no weird translation happens
    FILE* inFile = fopen(fName,"rb");

    if ( inFile == NULL ) {
	printf("Cannot open the input file %s\n",fName);
    }

    unsigned char	buf[N_BUF];
    int n = fread(buf,1,N_BUF,inFile);

    //...Skip the indeces
    unsigned char* record_p = buf + 0634000;

    size_t nRecipe=0;
    size_t nBlock=0;
    size_t length;

    vector< vector< CB_String > > recipe(3);
    CB_String emptyField;

    for( ; record_p < buf + n && (*record_p) ; record_p += length + 2 ) {

	while( *record_p == 0x00 ) {
	    record_p++;
	    if ( record_p >= buf + n ) {
		return;
	    }
	}

	while( *record_p == 0xff ) {
	    record_p++;
	    nBlock++;
	    if(nBlock==3) {

		vector< CB_String >& block0 = recipe[0];
		vector< CB_String >& block1 = recipe[1];
		vector< CB_String >& block2 = recipe[2];

		//...Create a new recipe and enter it.
		CB_Recipe* recipe_p = new CB_Recipe();

		recipe_p -> _name      = block0[0];
		recipe_p -> _serves    = block0[1];
		recipe_p -> _category1 = block0[2];
		recipe_p -> _category2 = block0[3];
		recipe_p -> _category3 = block0[4];
		recipe_p -> _category4 = block0[5];
		if ( block0.size() >= 31 ) {
		    recipe_p -> _date = block0[30];
		}
		recipe_p -> _directions = block2;

		vector< CB_String >::iterator iBl;
		vector< CB_String >::iterator iBlEnd;

		//...The ingredient quadruples in block 0
		iBl = block0.begin() + 6;
		iBlEnd = block0.end();
		if ( block0.size() >= 31 ) {
		    iBlEnd = block0.begin() + 30;
		}
		if ( block0.size() <= 6 ) {
		    iBl = iBlEnd;
		}
		for ( ; iBl != iBlEnd ; ) {
		    CB_Ingredient* ingredient_p = NewIngredient( iBl, iBlEnd );
		    if ( ingredient_p != NULL ) {
			recipe_p -> _ingredients.push_back( ingredient_p );
		    }
		}

		//...The ingredient quadruples in block 1
		iBl = block1.begin();
		iBlEnd = block1.end();
		for ( ; iBl != iBlEnd ; ) {
		    CB_Ingredient* ingredient_p = NewIngredient( iBl, iBlEnd );
		    if ( ingredient_p != NULL ) {
			recipe_p -> _ingredients.push_back( ingredient_p );
		    }
		}

		//...Add the recipe (with indexing)
		Add( recipe_p );

		//...Clear blocks of records
		block0.clear();
		block1.clear();
		block2.clear();

		//...Advance to next recipe
		nRecipe++;
		nBlock=0;

		if ( nRecipe == 4 ) {
		    while( *record_p == 0x00 ) {
			record_p++;
		    }
		}

		//...I don't know why: special case of some sort
		if ( nRecipe == 250 ) record_p += 2;
		if ( nRecipe == 265 ) record_p += 257;
		if ( nRecipe == 435 ) record_p += 257;
		if ( nRecipe == 526 ) record_p += 2;
		if ( nRecipe == 563 ) record_p += 257;

		//...All done
		if ( nRecipe == 607 ) {
		    return;
		}
	    }
	}

	size_t recordNo = *(record_p) - 1;
	length = *(record_p+1);
	CB_String field( (char*)(record_p + 2), length );

	vector< CB_String >& block = recipe[ nBlock ];
	while ( block.size() < recordNo ) {
	    block.push_back( emptyField );
	}

	block.push_back( field );
    }
}

//PAGE
// ************************************************************************
CB_Ingredient*
CB_Book::NewIngredient(
    std::vector< CB_String >::iterator&	first,
    std::vector< CB_String >::iterator&	last
)
// ************************************************************************
{
    if ( first == last ) {
	return NULL;
    }

    CB_String* s1_p = NULL;
    CB_String* s2_p = NULL;
    CB_String* s3_p = NULL;
    CB_String* s4_p = NULL;

    size_t totSize = 0;

    // I have no idea what the heck I tried to do when I wrote this.
    // Using pointers and iterators together is a mess.
    // There was some change int the std, so that s1_p = first++
    // no longer works. Thus, the contortions.
    if ( first != last ) {
	s1_p = &(*(first++));
	totSize += s1_p -> size();
    }
    if ( first != last ) {
	s2_p = &(*(first++));
	totSize += s2_p -> size();
    }
    if ( first != last ) {
	s3_p = &(*(first++));
	totSize += s3_p -> size();
    }
    if ( first != last ) {
	s4_p = &(*(first++));
	totSize += s4_p -> size();
    }

    if ( totSize == 0 ) {
	return NULL;
    }

    CB_Ingredient* result = new CB_Ingredient();
    if ( s1_p != NULL ) result -> _quantity = (*s1_p);
    if ( s2_p != NULL ) result -> _measurement = (*s2_p);
    if ( s3_p != NULL ) result -> _preparation = (*s3_p);
    if ( s4_p != NULL ) result -> _ingredient = (*s4_p);

    return result;
}

//PAGE
// ************************************************************************
void
CB_Book::TestDeletion()
// ************************************************************************
{
    while ( _recipes.size() > 1 ) {
	CB_Recipe* recipe_p = _recipes[0];
	Delete( recipe_p ) ;
    }
}

//PAGE
// ************************************************************************
void
CB_Book::Index()
// ************************************************************************
{
    size_t i;
    size_t nRecipe = _recipes.size();

    for ( i = 0 ; i < nRecipe ; i++ ) {
	CB_Recipe* recipe_p = _recipes[i];
	IndexRecipe( recipe_p );
    }
}

//PAGE
// ************************************************************************
void
CB_Book::IndexRecipe(
    CB_Recipe*	recipe_p
)
// ************************************************************************
{
    //...Sorted by name
    _sortedByName.insert( CB_RecipeMap_t::value_type(
			    recipe_p -> _name , recipe_p ) );
    
    //...Sorted by category
    if ( recipe_p -> _category1.size() > 0 ) {
	_categoryNames.insert( recipe_p -> _category1 );
	_sortedByCategory.insert( CB_RecipeMap_t::value_type(
			    recipe_p -> _category1 , recipe_p ) );
    }
    if ( recipe_p -> _category2.size() > 0 ) {
	_categoryNames.insert( recipe_p -> _category2 );
	_sortedByCategory.insert( CB_RecipeMap_t::value_type(
			    recipe_p -> _category2 , recipe_p ) );
    }
    if ( recipe_p -> _category3.size() > 0 ) {
	_categoryNames.insert( recipe_p -> _category3 );
	_sortedByCategory.insert( CB_RecipeMap_t::value_type(
			    recipe_p -> _category3 , recipe_p ) );
    }
    if ( recipe_p -> _category4.size() > 0 ) {
	_categoryNames.insert( recipe_p -> _category4 );
	_sortedByCategory.insert( CB_RecipeMap_t::value_type(
			    recipe_p -> _category4 , recipe_p ) );
    }

    //...Sorted by ingredient
    CB_Ingredient_pVector_t::iterator iIng = recipe_p ->
						    _ingredients.begin();
    CB_Ingredient_pVector_t::iterator iIngEnd = recipe_p ->
						    _ingredients.end();

    for ( ; iIng != iIngEnd ; iIng++ ) {
	CB_String qName = (*iIng) -> _quantity;
	CB_String mName = (*iIng) -> _measurement;
	CB_String pName = (*iIng) -> _preparation;
	CB_String iName = (*iIng) -> _ingredient;
	if ( qName.size() > 0 ) {
	    _quantityNames.insert( qName );
	}
	if ( mName.size() > 0 ) {
	    _measurementNames.insert( mName );
	}
	if ( pName.size() > 0 ) {
	    _preparationNames.insert( pName );
	}
	if ( iName.size() > 0 ) {
	    _ingredientNames.insert( iName );
	    _sortedByIngredient.insert( CB_RecipeMap_t::value_type(
				iName , recipe_p ) );
	}
	
    }
}

//PAGE
// ************************************************************************
void
CB_Book::DeleteFromMap(
    CB_Recipe*		recipe_p,
    CB_RecipeMap_t&	theMap
)
// ************************************************************************
{
    //...Delete all references to the recipe from the map
    CB_RecipeMap_t::iterator itorThis;
    CB_RecipeMap_t::iterator itor = theMap.begin();
    CB_RecipeMap_t::iterator itorEnd = theMap.end();

    while ( itor != itorEnd ) {
	itorThis = itor;
	itor++;
	if ( (*itorThis).second == recipe_p ) {
	    theMap.erase( itorThis );
	}
    }
}

//PAGE
// ************************************************************************
CB_Stream::CB_Stream(
    const char*	fileName,
    const char*	mode
)
// ************************************************************************
{
    _file = fopen( fileName, mode );
    if (!_file) {
      perror(fileName);
      exit(1);
    }
}

//PAGE
// ************************************************************************
CB_Stream::~CB_Stream()
// ************************************************************************
{
    fclose( _file );
}

//PAGE
// ************************************************************************
CB_Stream&
CB_Stream::operator << (
    const CB_String	s
)
// ************************************************************************
{
    (*this) << (*(s._itor)).second.address;
    return *this;
}

//PAGE
// ************************************************************************
CB_Stream&
CB_Stream::operator << (
    const CB_StringTable&	table
)
// ************************************************************************
{
    //...Sizes
    (*this) << table._byString.size();
    (*this) << table._byAddress.size();
    (*this) << table._freeAddresses.size();

    CB_StringTable_t::const_iterator iStr = table._byString.begin();
    CB_StringTable_t::const_iterator iStrEnd = table._byString.end();

    //...Strings
    for ( ; iStr != iStrEnd; iStr++ ) {
	//...Reference count and address
	(*this) << (*iStr).second.refCount;
	(*this) << (*iStr).second.address;

	const char* p = (*iStr).first.data();
	size_t n = (*iStr).first.size();

	//...Char count and characters
	(*this) << n;
	fwrite( p, 1, n, _file );
    }

    //...Free addresses
    vector< size_t >::const_iterator itor = table._freeAddresses.begin();
    vector< size_t >::const_iterator itorEnd = table._freeAddresses.end();

    for ( ; itor != itorEnd ; itor++ ) {
	(*this) << (*itor);
    }

    return *this;
}

//PAGE
// ************************************************************************
CB_Stream&
CB_Stream::operator << (
    const CB_Ingredient&	ingr
)
// ************************************************************************
{
    (*this) << ingr._quantity;
    (*this) << ingr._measurement;
    (*this) << ingr._preparation;
    (*this) << ingr._ingredient;

    return *this;
}

//PAGE
// ************************************************************************
CB_Stream&
CB_Stream::operator << (
    const CB_Recipe&	recipe
)
// ************************************************************************
{
    //...Sizes
    (*this) << recipe._ingredients.size();
    (*this) << recipe._directions.size();

    //...Single strings
    (*this) << recipe._name;
    (*this) << recipe._serves;
    (*this) << recipe._category1;
    (*this) << recipe._category2;
    (*this) << recipe._category3;
    (*this) << recipe._category4;
    (*this) << recipe._date;

    CB_Ingredient_pVector_t::const_iterator iIng = recipe._ingredients.begin();
    CB_Ingredient_pVector_t::const_iterator iIngEnd = recipe._ingredients.end();

    //...Ingredients
    for ( ; iIng != iIngEnd; iIng++ ) {
	(*this) << *(*iIng);
    }

    vector< CB_String >::const_iterator iDir = recipe._directions.begin();
    vector< CB_String >::const_iterator iDirEnd = recipe._directions.end();

    //...Directions
    for ( ; iDir != iDirEnd; iDir++ ) {
	(*this) << (*iDir);
    }

    return *this;
}

//PAGE
// ************************************************************************
CB_Stream&
CB_Stream::operator << (
    const CB_Book&	book
)
// ************************************************************************
{
    //...Sizes
    (*this) << book._recipes.size();

    CB_Recipe_pVector_t::const_iterator iRec = book._recipes.begin();
    CB_Recipe_pVector_t::const_iterator iRecEnd = book._recipes.end();

    //...Recipes
    for ( ; iRec != iRecEnd; iRec++ ) {
	(*this) << *(*iRec);
    }

    return *this;
}

//PAGE
// ************************************************************************
CB_Stream&
CB_Stream::operator >> (
    CB_String&	s
)
// ************************************************************************
{
    //...Delete the current reference of this object
    assert( (*(s._itor)).second.refCount > 0 );
    (*(s._itor)).second.refCount--;
    if ( (*(s._itor)).second.refCount == 0 ) {
	s._theStringTable_p -> Erase( s._itor );
    }

    size_t address;
    (*this) >> address;
    s._itor = s._theStringTable_p -> _byAddress[ address ];
    return *this;
}

//PAGE
// ************************************************************************
CB_Stream&
CB_Stream::operator >> (
    CB_StringTable&	table
)
// ************************************************************************
{
//TODO
    //...Sizes
    size_t byStringSize;
    size_t byAddressSize;
    size_t freeAddressesSize;

    (*this) >> byStringSize;
    (*this) >> byAddressSize;
    (*this) >> freeAddressesSize;

    table._byAddress.resize( byAddressSize );
    table._freeAddresses.resize( freeAddressesSize );

    //...Input buffer
    string inString;

    CB_StringTable_t::iterator iStr = table._byString.begin();

    //...For all strings
    size_t i = 0;
    for ( i = 0 ; i < byStringSize ; i ++ ) {
	size_t refCount;
	size_t address;
	(*this) >> refCount;
	(*this) >> address;

	size_t n;
	(*this) >> n;

	inString.resize( n , ' ' );
	//...Write into the string: cast as not const
	fread( (char*) inString.data(), 1, n, _file );

	//...Insert the string into the table (at the end)
	iStr = table._byString.insert( iStr,
				CB_StringTable_t::value_type( inString,
					CB_StringData(refCount,address) ) );

	//...Save the string pointer in the address vector
	table._byAddress[ address ] = iStr;

    }

    //...Free addresses
    vector< size_t >::iterator itor = table._freeAddresses.begin();
    vector< size_t >::iterator itorEnd = table._freeAddresses.end();

    for ( ; itor != itorEnd ; itor++ ) {
	(*this) >> (*itor);
    }

    return *this;
}

//PAGE
// ************************************************************************
CB_Stream&
CB_Stream::operator >> (
    CB_Ingredient&	ingr
)
// ************************************************************************
{
    (*this) >> ingr._quantity;
    (*this) >> ingr._measurement;
    (*this) >> ingr._preparation;
    (*this) >> ingr._ingredient;

    return *this;
}

//PAGE
// ************************************************************************
CB_Stream&
CB_Stream::operator >> (
    CB_Recipe&	recipe
)
// ************************************************************************
{
//TODO
    //...Sizes
    size_t nIngredients;
    size_t nDirections;

    (*this) >> nIngredients;
    (*this) >> nDirections;

    //...Single strings
    (*this) >> recipe._name;
    (*this) >> recipe._serves;
    (*this) >> recipe._category1;
    (*this) >> recipe._category2;
    (*this) >> recipe._category3;
    (*this) >> recipe._category4;
    (*this) >> recipe._date;

    //...Ingredients
    size_t i;
    for ( i = 0 ; i < nIngredients ; i++ ) {
	CB_Ingredient* ingredient_p = new CB_Ingredient();
	recipe._ingredients.push_back( ingredient_p );
	(*this) >> (*ingredient_p);
    }

    //...Directions
    recipe._directions.resize( nDirections );
    vector< CB_String >::iterator iDir = recipe._directions.begin();
    vector< CB_String >::iterator iDirEnd = recipe._directions.end();

    for ( ; iDir != iDirEnd; iDir++ ) {
	(*this) >> (*iDir);
    }

    return *this;
}

//PAGE
// ************************************************************************
CB_Stream&
CB_Stream::operator >> (
    CB_Book&	book
)
// ************************************************************************
{
    //...Size
    size_t nRecipes;
    (*this) >> nRecipes;

    //...Recipes
    size_t i;
    for ( i = 0 ; i < nRecipes ; i++ ) {
	CB_Recipe* recipe_p = new CB_Recipe();
	book._recipes.push_back( recipe_p );
	(*this) >> (*recipe_p);
    }

    return *this;
}
