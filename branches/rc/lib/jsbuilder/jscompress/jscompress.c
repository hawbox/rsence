/*
 * jscompress - compression of _words into _0.._Z, _00...
 *
 * Author:  Domen Puncer <domen@cba.si>
 * License: BSD
 *
 * Ideas taken from js_builder.rb (Himle Server) by Juha-Jarmo Heinonen
 */


#include <stdlib.h>
#include "ruby.h"


static char **reserved;
static int nreserved;
static int *reserved_indexes;


static inline int isvarchr(int c)
{
	if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
			(c >= '0' && c <= '9') || c == '_')
		return 1;
	return 0;
}

struct tree_node {
	int left, right;
	const char *var;
	int count;	/* how many occurances of this 'var' were there */
	int index;	/* most used var gets 0... */
	int arr_index;	/* original index in array, so resort can fix the tree */
};

static struct tree_node *tree_node_arr;
static const int tree_node_arr_inc = 256;	/* allocate this many tree nodes at once */
static int tree_node_arr_count;			/* this many nodes are full */
static int tree_node_arr_size;			/* place for this many nodes */


/* string functions, except they're end-of-var terminated, not just '\0' */
static int strlenv(const char *s)
{
	int len = 0;

	while (isvarchr(*s++))
		len++;
	return len;
}

static int strcmpv(const char *s1, const char *s2)
{
	int c1, c2;

	do {
		c1 = *s1++;
		c2 = *s2++;

		if (!isvarchr(c1))
			c1 = 0;
		if (!isvarchr(c2))
			c2 = 0;

		if (c1 != c2)
			return c1-c2;

	} while (c1 && c2);

	return 0;
}

/* tree functions, used to build a dictionary */
/* tree_find returns the matching node, or if no match, the closest node */
static struct tree_node *tree_find(struct tree_node *root, const char *name)
{
	struct tree_node *node = root;

	do {
		int next;
		int cmp;
		cmp = strcmpv(name, node->var);
		if (cmp == 0) {
			return node;

		} else if (cmp < 0) {
			if (node->left == -1)
				return node;
			else
				next = node->left;
		} else {
			if (node->right == -1)
				return node;
			else
				next = node->right;
		}
		node = &root[next];

	} while (1);
}

static void tree_add(const char *name)
{
	struct tree_node *parent, *me;
	int cmp;

	if (tree_node_arr_count >= tree_node_arr_size) {
		void *tmp = tree_node_arr;
		tree_node_arr_size += tree_node_arr_inc;
		tree_node_arr = realloc(tmp,
				tree_node_arr_size * sizeof(tree_node_arr[0]));
		if (!tree_node_arr) {
			free(tmp);
			rb_raise(rb_eNoMemError, "malloc failed in %s", __func__);
		}
	}

	me = NULL;
	if (tree_node_arr_count) {
		parent = tree_find(tree_node_arr, name);

		cmp = strcmpv(name, parent->var);
		if (cmp == 0) {
			parent->count++;
		} else {
			me = &tree_node_arr[tree_node_arr_count];
			if (cmp < 0)
				parent->left = tree_node_arr_count;
			else
				parent->right = tree_node_arr_count;

			tree_node_arr_count++;
		}

	} else {
		me = &tree_node_arr[tree_node_arr_count++];
	}

	if (me) {
		me->left = me->right = -1;
		me->var = name;
		me->count = 1;
	}		
}

/* qsort and bsearch compare function */
static int cmp_str(const void *p1, const void *p2)
{
	const char * const *s1 = p1;
	const char * const *s2 = p2;

	return strcmpv(*s1, *s2);
}

static int cmp_int(const void *p1, const void *p2)
{
	const int *i1 = p1;
	const int *i2 = p2;

	return *i1 > *i2;
}

static int is_reserved(const char *str)
{
	 return bsearch(&str, reserved, nreserved, sizeof(*reserved), cmp_str) != 0;
}

/* scan the string, and build a dictionary tree of variables */
static void jscompress_scan(const char *s, int len)
{
	const char *end = s + len;
	int invar = 0; /* currently parsing a variable */

	while (s < end) {
		char c = *s++;

		/* start of a variable, add it to variable tree */
		if (c == '_' && invar == 0) {
			invar = 1;
	
			if (!is_reserved(s))
				tree_add(s);
		}
		invar = isvarchr(c);
	}
}


/* input: index; output: characters 0..Z, 00..ZZ, ... */
static int jscompress_generate_name(char *dest, int x)
{
	const int count = ('9'-'0'+1)+('z'-'a'+1)+('Z'-'A'+1);
	int len = 0;

	x++;
	do {
		int rem;
		char chr;

		x--;
		rem = x % count;

		if (rem < ('9'-'0'+1))
			chr = rem + '0';
		else {
			rem -= ('9'-'0'+1);
			if (rem < ('z'-'a'+1))
				chr = rem + 'a';
			else {
				rem -= ('z'-'a'+1);
				chr = rem + 'A';
			}
		}
		*dest++ = chr;
		len++;
		x /= count;

	} while (x > 0);

	*dest = '\0';

	return len;
}

/* reverse of upper function */
static int jscompress_index_from_name(const char *name)
{
	const int count = ('9'-'0'+1)+('z'-'a'+1)+('Z'-'A'+1);
	int x = 0;
	char c = *name++;

	if (c >= '0' && c <= '9')
		x += c - '0';
	else if (c >= 'a'&& c <= 'z')
		x += c - 'a' + ('9'-'0'+1);
	else
		x += c - 'A' + ('9'-'0'+1) + ('z'-'a'+1);

	if (isvarchr(*name)) {
		x += count * (1+jscompress_index_from_name(name));
	}

	return x;
}

/* replace variable names with shorter ones */
static int jscompress_replace(char *_dest, const char *s, int len)
{
	const char *end = s + len;
	int invar = 0; /* currently parsing a variable */
	char *dest = _dest;

	while (s < end) {
		char c = *s++;

		*dest++ = c;

		/* start of a variable, replace it with shorter */
		if (c == '_' && invar == 0) {
			struct tree_node *var;
			int varlen;

			invar = 1;

			if (!is_reserved(s)) {
				var = tree_find(tree_node_arr, s);

				varlen = jscompress_generate_name(dest, var->index);
				dest += varlen;
				s += strlenv(s);
			}
		}
		invar = isvarchr(c);
	}

	return dest - _dest;
}

/* sorting helpers */
static int jscompress_cmp_count(const void *p1, const void *p2)
{
	const struct tree_node *n1 = p1;
	const struct tree_node *n2 = p2;

	return n2->count - n1->count;
}

static int jscompress_cmp_arr_index(const void *p1, const void *p2)
{
	const struct tree_node *n1 = p1;
	const struct tree_node *n2 = p2;

	return n1->arr_index - n2->arr_index;
}

static VALUE jscompress(VALUE self, VALUE str)
{
	VALUE ret_str;
	int i;
	const char *s = RSTRING(str)->ptr;
	int len = RSTRING(str)->len;
	char *dest;
	int dest_len;
	int off;
	int res_idx;

	tree_node_arr_count = 0;
	tree_node_arr_size = 0;
	tree_node_arr = NULL;

	if (isvarchr(s[len-1]))
	        rb_raise(rb_eException, "%s: last character of file is variable char?", __func__);

	/* build a dictionary */
	jscompress_scan(s, len);

	/* remember original positions of tree node in array */
	for (i=0; i<tree_node_arr_count; i++)
		tree_node_arr[i].arr_index = i;

	/* sort words descending by occurence */
	qsort(tree_node_arr, tree_node_arr_count, sizeof(tree_node_arr[0]),
			jscompress_cmp_count);

	/* mark word indexes and offset them, so reserved names are not used */
	off = 0;
	res_idx = 0;
	for (i=0; i<tree_node_arr_count; i++) {
		if (reserved_indexes[res_idx] == i + off) {
			res_idx++;
			off++;
		}
		tree_node_arr[i].index = i + off;
	}

	/* restore original tree node positions in array */
	qsort(tree_node_arr, tree_node_arr_count, sizeof(tree_node_arr[0]),
			jscompress_cmp_arr_index);

	/* since we use minimal variables, destination is always smaller than source */
	dest = malloc(len);
	if (!dest) {
		free(tree_node_arr);
		rb_raise(rb_eNoMemError, "%s: malloc failed", __func__);
	}

	/* replace variables with shorter versions */
	dest_len = jscompress_replace(dest, s, len);

	ret_str = rb_str_new(dest, dest_len);

	free(dest);
	free(tree_node_arr);

	return ret_str;
}


static VALUE jscompress_initialize(VALUE self, VALUE res)
{
	int i;

	nreserved = RARRAY(res)->len;
	reserved = ALLOC_N(char *, nreserved);
	reserved_indexes = ALLOC_N(int, nreserved+1);

	/* prepare reserved identifiers for lookups */
	for (i=0; i<nreserved; i++) {
		VALUE str = RARRAY(res)->ptr[i];
		int len = RSTRING(str)->len;
		const char *var = RSTRING(str)->ptr+1;
		int var_len = strlenv(var);

		reserved[i] = ALLOC_N(char, len);
		memcpy(reserved[i], var, len-1);
		reserved[i][len-1] = '\0';

		/* >62**4 variables, no way this happens
		 * variables with extra '_' can't clash with our generated ones */
		if (var_len > 4 || memchr(var, '_', var_len) != NULL)
			reserved_indexes[i] = INT_MAX;
		else
			reserved_indexes[i] = jscompress_index_from_name(var);

	}
	reserved_indexes[i] = INT_MAX;

	/* sort reserved names, so we can bsearch them */
	qsort(reserved, nreserved, sizeof(*reserved), cmp_str);

	/* asc sort of name indexes */
	qsort(reserved_indexes, nreserved, sizeof(*reserved_indexes), cmp_int);

	return self;
}


static VALUE cl;

void Init_jscompress()
{
	cl = rb_define_class("JSCompress", rb_cObject);
	rb_define_method(cl, "initialize", jscompress_initialize, 1);
	rb_define_method(cl, "compress", jscompress, 1);
}
