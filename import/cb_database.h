//PAGE
// ************************************************************************
// cb_database.h
// ************************************************************************
//
// Internal implementation of the Cookbook database
//
//------------------------------------------------------------------------
//
// Copyright C 2002
// Lynguent, Inc
// An Unpublished Work - All Rights Reserved
//
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

#ifndef CB_DATABASE_H /* { */
#define CB_DATABASE_H

// Debugger name truncation warning:
#  pragma warning( disable: 4786 )

#include <assert.h>

#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <set>

#include <string.h>
#include <stdio.h>
#include <inttypes.h>

class CB_String;
class CB_StringTable;

class CB_Ingredient;
class CB_Recipe;
class CB_Book;

class CB_Stream;

class CB_Display;

typedef std::vector< CB_Ingredient* >		CB_Ingredient_pVector_t;
typedef std::vector< CB_Recipe* >		CB_Recipe_pVector_t;

//PAGE
// ************************************************************************
struct CB_StringData
// ************************************************************************
//
// Part of the String Table implementation. This information is kept
// for each string that exists in the String Table.
//
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
{
    size_t	refCount;
    size_t	address;

    CB_StringData() : refCount(0), address(0) {}
    CB_StringData( size_t c, size_t a) : refCount(c), address(a) {}
};

//PAGE
// ************************************************************************
// String table support
// ************************************************************************

//...Case sensitive string comparison. Used by string table
struct LT_String {
    bool operator() (const std::string& s1, const std::string& s2) const
    {
	return strcmp( s1.c_str(), s2.c_str() ) < 0;
    }
};

typedef std::map< std::string, CB_StringData, LT_String >
						CB_StringTable_t;
typedef std::vector< CB_StringTable_t::iterator >
						CB_StringItorVector_t;

std::ostream&	operator << ( std::ostream& o, const CB_String s );

//PAGE
// ************************************************************************
class CB_String
// ************************************************************************
//
// Description:
// ============
//
// A CB_String object is a reference to a string stored in a CB_StringTable.
// It is a read-only string, i.e. it cannot be modified.
//
// Manager functions:
// ==================
//
//	ctor
//	dtor
//	copy ctor
//	assignment operator
//
//	CB_String( const char* s, size_t sLength )
//
// Accessor functions:
// ===================
//
// Implementation functions:
// =========================
//
//	char*	c_str()	//...STL string::c_str()
//	size_t	size()	//...STL string::c_str()
//
//	bool	IsSameAs( const CB_String )	//...case insensitive compare
//
// Implementation Notes:
// =====================
//
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
{

public:
    
    friend class CB_Stream;

    //--------------------------------------------------
    // Manager functions: constructors, destructors,
    // assignment operators, type conversion operators
    //--------------------------------------------------
    CB_String();
    CB_String( const char* s );
    CB_String( const char* s, size_t sLength );

    ~CB_String();

    CB_String( const CB_String& o );
    CB_String& operator=( const CB_String& o );

    //--------------------------------------------------
    // Accessor functions: Get_dataMember; Set_dataMember
    //--------------------------------------------------

    //--------------------------------------------------
    // Implementation functions
    //--------------------------------------------------
    const char*		c_str() const { return (*_itor).first.c_str(); }
    const size_t	size() const { return (*_itor).first.size(); }
    const std::string&  str() const { return (*_itor).first; }

#if 0
    bool		IsSameAs( const CB_String o )
				{ return _stricmp( (*_itor).first.c_str(),
					   (*(o._itor)).first.c_str() ) == 0; }
#endif

protected:

private:

    //--------------------------------------------------
    // Data Members
    //--------------------------------------------------

    static CB_StringTable*		_theStringTable_p;

    CB_StringTable_t::iterator		_itor;
};

//PAGE
// ************************************************************************
class CB_StringTable
// ************************************************************************
//
// Description:
// ============
//
// The string table keeps strings that can be shared.
// It also provides support for conversion between a string
// and its unique address. The address is used in persistent storage.
//
// Manager functions:
// ==================
//	ctor
//	dtor
//
// Accessor functions:
// ===================
//
// Implementation functions:
// =========================
//
//	size_t				Size() const
//	void				Clear()
//	void				Print( ostream& o );
//
// Private. These are for use by friend CB_String.
//
//	CB_StringTable_t::iterator	Insert( const char* s, size_t sLength );
//	void				Erase(CB_StringTable_t::iterator itor)
//
// Implementation Notes:
// =====================
//
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
{

public:
    
    friend class CB_String;
    friend class CB_Stream;

    //--------------------------------------------------
    // Manager functions: constructors, destructors,
    // assignment operators, type conversion operators
    //--------------------------------------------------
    CB_StringTable() {}
    ~CB_StringTable() {}

    //--------------------------------------------------
    // Accessor functions: Get_dataMember; Set_dataMember
    //--------------------------------------------------

    //--------------------------------------------------
    // Implementation functions
    //--------------------------------------------------

    size_t			Size() const { return _byString.size(); }

    void			Clear()
				    {
					_freeAddresses.clear();
					_byString.clear();
					_byAddress.clear();
				    }

    void			Print( std::ostream& o );

protected:

private:

    //--------------------------------------------------
    // Default copy constructor remains undefined
    //--------------------------------------------------
    CB_StringTable( const CB_StringTable& );

    //--------------------------------------------------
    // Default assignment operator remains undefined
    //--------------------------------------------------
    CB_StringTable& operator=( const CB_StringTable& );

    //--------------------------------------------------
    // Implementation functions
    //--------------------------------------------------

    CB_StringTable_t::iterator	Insert( const char* s, size_t l );
    void			Erase(CB_StringTable_t::iterator itor)
				    {
					assert( (*itor).second.refCount == 0 );
					_freeAddresses.push_back(
						     (*itor).second.address );
					_byString.erase( itor );
				    }

    //--------------------------------------------------
    // Data Members
    //--------------------------------------------------
    CB_StringTable_t		_byString;
    CB_StringItorVector_t	_byAddress;

    std::vector< size_t >	_freeAddresses;
};

//PAGE
// ************************************************************************
// Sorting by string value support
// ************************************************************************

//...Case insensitive CB_String comparison. Used by cookbook.
struct LT_CB_String {
    bool operator() (const CB_String& s1, const CB_String& s2) const
    {
      //return _stricmp( s1.c_str(), s2.c_str() ) < 0;
	return strcmp( s1.c_str(), s2.c_str() ) < 0;
    }
};

typedef std::multimap< CB_String, CB_Recipe*, LT_CB_String >	CB_RecipeMap_t;
typedef std::set< CB_String, LT_CB_String >			CB_StringSet_t;

//PAGE
// ************************************************************************
class CB_Ingredient
// ************************************************************************
//
// Description:
// ============
//
// An ingredient is a quadruple:
//	Quantity
//	Measurement
//	Preparation
//	Ingredient
//
// Manager functions:
// ==================
//
// Accessor functions:
// ===================
//
// Implementation functions:
// =========================
//
// Implementation Notes:
// =====================
//
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
{

public:
    
    friend class CB_Stream;
    friend class CB_Book;
    friend class CB_RecipeDialog;

    //--------------------------------------------------
    // Manager functions: constructors, destructors,
    // assignment operators, type conversion operators
    //--------------------------------------------------
    CB_Ingredient() {};
    ~CB_Ingredient() {};

    //--------------------------------------------------
    // Default copy constructor
    // Default assignment operator
    //--------------------------------------------------
    CB_Ingredient( const CB_Ingredient& o )
    {
	_quantity = o._quantity;
	_measurement = o._measurement;
	_preparation = o._preparation;
	_ingredient = o._ingredient;
    }

    CB_Ingredient& operator=( const CB_Ingredient& o )
    {
	_quantity = o._quantity;
	_measurement = o._measurement;
	_preparation = o._preparation;
	_ingredient = o._ingredient;
	return *this;
    }

    //--------------------------------------------------
    // Accessor functions: Get_dataMember; Set_dataMember
    //--------------------------------------------------
    const CB_String& Get_quantity() { return _quantity; }
    const CB_String& Get_measurement() { return _measurement; }
    const CB_String& Get_preparation() { return _preparation; }
    const CB_String& Get_ingredient() { return _ingredient; }

    //--------------------------------------------------
    // Implementation functions
    //--------------------------------------------------

    bool		Empty()
			{
			    return _quantity.size() + _measurement.size() +
				 _preparation.size() + _ingredient.size() == 0;
			}
    void		Print( std::ostream& );

protected:

private:

    //--------------------------------------------------
    // Data Members
    //--------------------------------------------------

    CB_String	_quantity;
    CB_String	_measurement;
    CB_String	_preparation;
    CB_String	_ingredient;
};

//PAGE
// ************************************************************************
class CB_Recipe
// ************************************************************************
//
// Description:
// ============
//
// Manager functions:
// ==================
//
// Accessor functions:
// ===================
//
// Implementation functions:
// =========================
//
// Implementation Notes:
// =====================
//
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
{

public:

    friend class CB_Stream;
    friend class CB_Book;
    friend class CB_MainFrame;
    friend class CB_Display;
    friend class CB_RecipeDialog;

    //--------------------------------------------------
    // Manager functions: constructors, destructors,
    // assignment operators, type conversion operators
    //--------------------------------------------------
    CB_Recipe() {};
    ~CB_Recipe() { Clear(); }

    //--------------------------------------------------
    // Default copy constructor
    // Default assignment operator
    //--------------------------------------------------
    CB_Recipe( const CB_Recipe& o ) { Copy( o ); }
    CB_Recipe& operator=( const CB_Recipe& o )
   				 { Clear(); Copy( o ); return *this; }

    //--------------------------------------------------
    // Accessor functions: Get_dataMember; Set_dataMember
    //--------------------------------------------------

    const CB_String&			Get_name() { return _name; }
    const CB_String&			Get_serves() { return _serves; }
    const CB_String&			Get_cat1() { return _category1; }
    const CB_String&			Get_cat2() { return _category2; }
    const CB_String&			Get_cat3() { return _category3; }
    const CB_String&			Get_cat4() { return _category4; }
    const CB_String&			Get_date() { return _date; }
    const CB_Ingredient_pVector_t&	Get_ingredients() { return _ingredients; }
    const std::vector< CB_String >&	Get_directions() { return _directions; }

    //--------------------------------------------------
    // Implementation functions
    //--------------------------------------------------

    void		Clear();

    void		Print( std::ostream& );
    void		PrintDirections( std::ostream& );
    size_t		CategorySize()
			{
			    return _category1.size() + _category2.size() +
					_category3.size() + _category4.size();
    			}

protected:

private:

    //--------------------------------------------------
    // Implementation functions
    //--------------------------------------------------
    void		Copy( const CB_Recipe& o );

    //--------------------------------------------------
    // Data Members
    //--------------------------------------------------

    CB_String			_name;
    CB_String			_serves;
    CB_String			_category1;
    CB_String			_category2;
    CB_String			_category3;
    CB_String			_category4;
    CB_String			_date;
    CB_Ingredient_pVector_t	_ingredients;
    std::vector< CB_String >	_directions;
};

//PAGE
// ************************************************************************
class CB_Book
// ************************************************************************
//
// Description:
// ============
//
// Manager functions:
// ==================
//
// Accessor functions:
// ===================
//
// Implementation functions:
// =========================
//
// Implementation Notes:
// =====================
//
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
{

public:

    friend class CB_Stream;

    //--------------------------------------------------
    // Manager functions: constructors, destructors,
    // assignment operators, type conversion operators
    //--------------------------------------------------
    CB_Book() : _isDirty( false ) {};
    ~CB_Book() { Clear(); };

    //--------------------------------------------------
    // Accessor functions: Get_dataMember; Set_dataMember
    //--------------------------------------------------
    void			Set_isDirty( bool v = true) { _isDirty = v; }
    void			Clr_isDirty() { _isDirty = false; }
    bool			Get_isDirty() { return _isDirty; }

    CB_RecipeMap_t&		Get_sortedByName()
					{ return _sortedByName; }
    CB_RecipeMap_t&		Get_sortedByCategory()
					{ return _sortedByCategory; }
    CB_RecipeMap_t&		Get_sortedByIngredient()
					{ return _sortedByIngredient; }

    CB_StringSet_t&		Get_categoryNames()
						{ return _categoryNames; }
    CB_StringSet_t&		Get_quantityNames()
						{ return _quantityNames; }
    CB_StringSet_t&		Get_measurementNames()
						{ return _measurementNames; }
    CB_StringSet_t&		Get_preparationNames()
						{ return _preparationNames; }
    CB_StringSet_t&		Get_ingredientNames()
						{ return _ingredientNames; }

    //--------------------------------------------------
    // Implementation functions
    //--------------------------------------------------

    void		Read( const char* fileName );
    void		Write( char* fileName );
    void		MakeBackup( char* fileName );

    void		Clear();

    void		Add( CB_Recipe* );	//...After indexing
    void		Delete( CB_Recipe* );	//...After indexing

    void		Print( std::ostream& );
    void		PrintSortedNames( std::ostream& );
    void		PrintSortedCategories( std::ostream& );
    void		PrintSortedIngredients( std::ostream& );

    void		Import( char* fileName );
    			// Import original cookbook data

    CB_Ingredient*	NewIngredient(
			    std::vector< CB_String >::iterator&	first,
			    std::vector< CB_String >::iterator&	last
			);

    void		TestDeletion();

protected:

private:

    //--------------------------------------------------
    // Default copy constructor remains undefined
    //--------------------------------------------------
    CB_Book( const CB_Book& );

    //--------------------------------------------------
    // Default assignment operator remains undefined
    //--------------------------------------------------
    CB_Book& operator=( const CB_Book& );

    //--------------------------------------------------
    // Implementation functions
    //--------------------------------------------------

    void		Index();
    void		IndexRecipe( CB_Recipe* recipe_p );
    void		DeleteFromMap(
			    CB_Recipe*		recipe_p,
			    CB_RecipeMap_t&	theMap
			);

    //--------------------------------------------------
    // Data Members
    //--------------------------------------------------

    bool			_isDirty;

    CB_Recipe_pVector_t		_recipes;

    CB_RecipeMap_t		_sortedByName;
    CB_RecipeMap_t		_sortedByCategory;
    CB_RecipeMap_t		_sortedByIngredient;

    CB_StringSet_t		_categoryNames;
    CB_StringSet_t		_quantityNames;
    CB_StringSet_t		_measurementNames;
    CB_StringSet_t		_preparationNames;
    CB_StringSet_t		_ingredientNames;
};

//PAGE
// ************************************************************************
class CB_Stream
// ************************************************************************
//
// Description:
// ============
//
// Manager functions:
// ==================
//
// Accessor functions:
// ===================
//
// Implementation functions:
// =========================
//
// Implementation Notes:
// =====================
//
//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
{

public:
    //--------------------------------------------------
    // Manager functions: constructors, destructors,
    // assignment operators, type conversion operators
    //--------------------------------------------------
    CB_Stream(const char* fileName, const char* mode);
    ~CB_Stream();

    //--------------------------------------------------
    // Accessor functions: Get_dataMember; Set_dataMember
    //--------------------------------------------------

    //--------------------------------------------------
    // Implementation functions
    //--------------------------------------------------

    //...Out
    CB_Stream&		operator << ( const CB_String );
    CB_Stream&		operator << ( const CB_StringTable& );
    CB_Stream&		operator << ( const CB_Book& );
    CB_Stream&		operator << ( const CB_Recipe& );
    CB_Stream&		operator << ( const CB_Ingredient& );

    CB_Stream&		operator << ( const size_t& v )
			    {
                              int32_t val = v;
				fwrite( &val, sizeof(int32_t), 1, _file );
				return *this;
			    }

    //...In
    CB_Stream&		operator >> ( CB_String& );
    CB_Stream&		operator >> ( CB_StringTable& );
    CB_Stream&		operator >> ( CB_Book& );
    CB_Stream&		operator >> ( CB_Recipe& );
    CB_Stream&		operator >> ( CB_Ingredient& );

    CB_Stream&		operator >> ( size_t& v )
			    {
                              int32_t val;
				fread( &val, sizeof(int32_t), 1, _file );
                                v = val;
				return *this;
			    }
protected:

private:

    //--------------------------------------------------
    // Default copy constructor remains undefined
    //--------------------------------------------------
    CB_Stream( const CB_Stream& );

    //--------------------------------------------------
    // Default assignment operator remains undefined
    //--------------------------------------------------
    CB_Stream& operator=( const CB_Stream& );

    //--------------------------------------------------
    // Data Members
    //--------------------------------------------------

    FILE*	_file;
};

//PAGE
#endif /* } */
